import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { Service } from '../entities/service.entity';
import { Organization } from '../entities/organization.entity';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI;

  constructor(
    @InjectRepository(Service)
    private serviceRepo: Repository<Service>,
    @InjectRepository(Organization)
    private orgRepo: Repository<Organization>,
    private configService: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
      timeout: 30000,
    });
  }

  private async loadServiceCatalog(orgId: string) {
    const services = await this.serviceRepo.find({
      where: { orgId, isActive: true, deletedAt: IsNull() },
      relations: ['destination'],
    });

    // Group by category and destination
    const grouped: Record<string, Record<string, any[]>> = {};
    for (const service of services) {
      const cat = service.category;
      const dest = service.destination?.name || 'Unknown';

      if (!grouped[cat]) grouped[cat] = {};
      if (!grouped[cat][dest]) grouped[cat][dest] = [];

      grouped[cat][dest].push({
        serviceId: service.id,
        name: service.name,
        description: service.description,
        vendorRate: Number(service.vendorRate),
        rateUnit: service.rateUnit,
        metadata: service.metadata,
      });
    }

    return grouped;
  }

  private buildSystemPrompt(orgName: string, catalog: any): string {
    return `You are a travel itinerary specialist for ${orgName}. You create day-by-day travel itineraries using ONLY the services available in the DMC's catalog.

AVAILABLE SERVICES:
${JSON.stringify(catalog, null, 2)}

RULES:
1. ONLY use services from the catalog above. Never invent services.
2. ONLY use vendor rates from the catalog. Never change rates.
3. For hotels: ASK the user which room type they want. ASK how many rooms they need. Do NOT assume.
4. For activities with child pricing: ASK how many adults and how many children. Do NOT assume.
5. For multi-city trips: ASK which cities and how many days per city. Auto-handle hotel check-in/out per city.
6. If a needed service (like inter-city transfer) doesn't exist in the catalog, include it in the itinerary with a note: "No rate available — please add manually."
7. Distribute activities logically — no two full-day activities on the same day.
8. When you have enough information, generate the complete itinerary as a JSON object.

When you need more information from the user, respond with a JSON object in this format:
{
  "type": "prompt",
  "question": "When are they traveling?",
  "options": [
    { "label": "April 2026", "value": "2026-04" },
    { "label": "May 2026", "value": "2026-05" },
    { "label": "Other", "value": "custom", "requiresInput": true }
  ],
  "inputType": "single_select"
}

When you have enough information, respond with the complete itinerary as JSON:
{
  "type": "itinerary",
  "name": "Dubai 3D2N Romantic Escape — Apr 2026",
  "destinations": ["Dubai"],
  "travelStartDate": "2026-04-15",
  "travelEndDate": "2026-04-17",
  "adultsCount": 2,
  "childrenCount": 0,
  "days": [
    {
      "dayNumber": 1,
      "date": "2026-04-15",
      "city": "Dubai",
      "services": [
        {
          "serviceId": "uuid-of-service",
          "serviceName": "DXB Airport to Dubai Hotel — Sedan",
          "category": "TRANSFERS",
          "quantity": 1,
          "vendorRate": 25,
          "rateUnit": "PER_VEHICLE",
          "subtotal": 25,
          "notes": null,
          "metadata": { }
        }
      ]
    }
  ],
  "vendorTotal": 630
}

Always respond with ONLY valid JSON. No markdown, no explanation outside JSON.`;
  }

  private async validateItinerary(orgId: string, itinerary: any) {
    if (!itinerary.days || !Array.isArray(itinerary.days)) {
      return itinerary;
    }

    let vendorTotal = 0;

    for (const day of itinerary.days) {
      if (!day.services || !Array.isArray(day.services)) continue;

      for (let i = day.services.length - 1; i >= 0; i--) {
        const svc = day.services[i];

        if (!svc.serviceId) continue;

        const dbService = await this.serviceRepo.findOne({
          where: {
            id: svc.serviceId,
            orgId,
            isActive: true,
            deletedAt: IsNull(),
          },
          relations: ['destination'],
        });

        if (!dbService) {
          // Service not found - mark it
          svc.notes = 'Service not found in catalog';
          svc.vendorRate = 0;
          svc.subtotal = 0;
          continue;
        }

        // Override with DB values
        svc.vendorRate = Number(dbService.vendorRate);
        svc.rateUnit = dbService.rateUnit;
        svc.serviceName = dbService.name;
        svc.category = dbService.category;
        svc.metadata = dbService.metadata;
        svc.photos = dbService.photos;

        // Recalculate subtotal
        const quantity = svc.quantity || 1;
        svc.subtotal = svc.vendorRate * quantity;

        vendorTotal += svc.subtotal;
      }
    }

    itinerary.vendorTotal = vendorTotal;
    return itinerary;
  }

  async startConversation(orgId: string, userMessage: string) {
    try {
      const org = await this.orgRepo.findOne({
        where: { id: orgId, deletedAt: IsNull() },
      });
      const orgName = org?.name || 'DMC';

      const catalog = await this.loadServiceCatalog(orgId);
      const systemPrompt = this.buildSystemPrompt(orgName, catalog);

      const messages: OpenAI.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ];

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 4096,
      });

      const responseText = completion.choices[0]?.message?.content || '';

      let parsed: any;
      try {
        parsed = JSON.parse(responseText);
      } catch {
        // Try extracting JSON from markdown code block
        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1].trim());
        } else {
          this.logger.error('Failed to parse AI response as JSON', responseText);
          return {
            type: 'prompt',
            question: responseText,
            options: [],
            inputType: 'text',
          };
        }
      }

      if (parsed.type === 'itinerary') {
        parsed = await this.validateItinerary(orgId, parsed);
      }

      // Return conversation history for frontend to maintain
      return {
        response: parsed,
        conversationHistory: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
          { role: 'assistant', content: JSON.stringify(parsed) },
        ],
      };
    } catch (error) {
      this.logger.error('AI conversation error', error);
      if (error instanceof OpenAI.APIError) {
        throw new InternalServerErrorException(
          'AI service is temporarily unavailable. Please try again later.',
        );
      }
      throw error;
    }
  }

  async continueConversation(
    orgId: string,
    conversationHistory: any[],
    answer: any,
  ) {
    try {
      const userMessage =
        typeof answer === 'string' ? answer : JSON.stringify(answer);

      const messages: OpenAI.ChatCompletionMessageParam[] = [
        ...conversationHistory.map((m) => ({
          role: m.role as 'system' | 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user', content: userMessage },
      ];

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 4096,
      });

      const responseText = completion.choices[0]?.message?.content || '';

      let parsed: any;
      try {
        parsed = JSON.parse(responseText);
      } catch {
        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1].trim());
        } else {
          this.logger.error('Failed to parse AI response as JSON', responseText);
          return {
            response: {
              type: 'prompt',
              question: responseText,
              options: [],
              inputType: 'text',
            },
            conversationHistory: [
              ...conversationHistory,
              { role: 'user', content: userMessage },
              { role: 'assistant', content: responseText },
            ],
          };
        }
      }

      if (parsed.type === 'itinerary') {
        parsed = await this.validateItinerary(orgId, parsed);
      }

      return {
        response: parsed,
        conversationHistory: [
          ...conversationHistory,
          { role: 'user', content: userMessage },
          { role: 'assistant', content: JSON.stringify(parsed) },
        ],
      };
    } catch (error) {
      this.logger.error('AI conversation error', error);
      if (error instanceof OpenAI.APIError) {
        throw new InternalServerErrorException(
          'AI service is temporarily unavailable. Please try again later.',
        );
      }
      throw error;
    }
  }
}
