import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { Quote } from '../entities/quote.entity';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  async generateQuotePdf(quote: Quote): Promise<Buffer> {
    const templatePath = path.join(process.cwd(), 'templates', 'quote-pdf.html');
    let template: string;

    try {
      template = fs.readFileSync(templatePath, 'utf-8');
    } catch {
      // Fallback template if file doesn't exist
      template = this.getDefaultTemplate();
    }

    const html = this.injectData(template, quote);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
        printBackground: true,
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  generateFilename(quoteName: string): string {
    return (
      quoteName
        .replace(/\s+/g, '-')
        .replace(/[—–]/g, '-')
        .replace(/[^\w-]/g, '') + '.pdf'
    );
  }

  private injectData(template: string, quote: Quote): string {
    const orgName = quote.organization?.name || 'RouteCraft DMC';
    const agentName = quote.createdBy?.name || 'Agent';
    const agentEmail = quote.createdBy?.email || '';
    const isFullPackage = quote.pricingFormat === 'full_package';
    const clientTotal = Number(quote.clientTotal) || 0;
    const validUntil = quote.validUntil
      ? new Date(quote.validUntil).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : '';

    // Build itinerary HTML
    let itineraryHtml = '';
    const itinerary = Array.isArray(quote.itinerary) ? quote.itinerary : [];
    for (const day of itinerary) {
      itineraryHtml += `<div class="day"><h3>Day ${day.dayNumber} — ${day.city || ''}</h3>`;
      if (day.date) {
        itineraryHtml += `<p class="date">${new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>`;
      }
      for (const svc of day.services || []) {
        const price = isFullPackage ? '' : `<span class="price">$${(Number(svc.subtotal) * (1 + (Number(quote.markupValue) || 0) / 100)).toFixed(2)}</span>`;
        itineraryHtml += `<div class="service"><span class="category">${svc.category}</span> <strong>${svc.serviceName}</strong> ${price}</div>`;
      }
      itineraryHtml += '</div>';
    }

    // Build pricing HTML
    let pricingHtml = '';
    if (isFullPackage) {
      pricingHtml = `<div class="total"><span>Total Package Price</span><span class="amount">$${clientTotal.toFixed(2)}</span></div>`;
    } else {
      // Itemized by category
      const catTotals: Record<string, number> = {};
      const markupPct = quote.markupType === 'percentage' ? (Number(quote.markupValue) || 0) / 100 : 0;
      for (const day of itinerary) {
        for (const svc of day.services || []) {
          const cat = svc.category || 'Other';
          catTotals[cat] = (catTotals[cat] || 0) + Number(svc.subtotal) * (1 + markupPct);
        }
      }
      for (const [cat, total] of Object.entries(catTotals)) {
        pricingHtml += `<div class="line-item"><span>${cat.charAt(0) + cat.slice(1).toLowerCase()}</span><span>$${total.toFixed(2)}</span></div>`;
      }
      pricingHtml += `<div class="total"><span>Total</span><span class="amount">$${clientTotal.toFixed(2)}</span></div>`;
    }

    return template
      .replace('{{ORG_NAME}}', orgName)
      .replace('{{AGENT_NAME}}', agentName)
      .replace('{{AGENT_EMAIL}}', agentEmail)
      .replace('{{QUOTE_NAME}}', quote.name)
      .replace('{{DESTINATIONS}}', (quote.destinations || []).join(', '))
      .replace('{{DATES}}', quote.travelStartDate && quote.travelEndDate
        ? `${new Date(quote.travelStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${new Date(quote.travelEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
        : '')
      .replace('{{TRAVELERS}}', `${quote.adultsCount || 0} adults${quote.childrenCount ? `, ${quote.childrenCount} children` : ''}`)
      .replace('{{ITINERARY}}', itineraryHtml)
      .replace('{{PRICING}}', pricingHtml)
      .replace('{{VALID_UNTIL}}', validUntil);
  }

  private getDefaultTemplate(): string {
    return `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1A1A2E; padding: 20px; }
  .header { border-bottom: 2px solid #6C5CE7; padding-bottom: 15px; margin-bottom: 20px; }
  .header h1 { color: #6C5CE7; margin: 0; font-size: 24px; }
  .header p { color: #6B7280; margin: 5px 0 0; }
  .quote-name { font-size: 20px; font-weight: bold; margin: 20px 0 10px; }
  .meta { color: #6B7280; font-size: 13px; margin-bottom: 20px; }
  .day { margin-bottom: 20px; }
  .day h3 { color: #6C5CE7; margin-bottom: 5px; }
  .date { color: #6B7280; font-size: 12px; }
  .service { padding: 8px 0; border-bottom: 1px solid #E8E6F0; display: flex; justify-content: space-between; }
  .category { background: #F0EDFF; color: #6C5CE7; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-right: 10px; }
  .price { font-weight: bold; }
  .pricing { margin-top: 30px; border-top: 2px solid #E8E6F0; padding-top: 15px; }
  .line-item { display: flex; justify-content: space-between; padding: 5px 0; }
  .total { display: flex; justify-content: space-between; padding: 10px 0; border-top: 2px solid #6C5CE7; margin-top: 10px; font-weight: bold; }
  .amount { color: #6C5CE7; font-size: 18px; }
  .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #E8E6F0; color: #6B7280; font-size: 12px; }
  .notice { font-style: italic; color: #9CA3AF; font-size: 11px; margin-top: 10px; }
</style>
</head>
<body>
  <div class="header">
    <h1>{{ORG_NAME}}</h1>
    <p>{{AGENT_NAME}} | {{AGENT_EMAIL}}</p>
  </div>
  <div class="quote-name">{{QUOTE_NAME}}</div>
  <div class="meta">{{DESTINATIONS}} | {{DATES}} | {{TRAVELERS}}</div>
  {{ITINERARY}}
  <div class="pricing">{{PRICING}}</div>
  <p class="notice">* Hotels are subject to availability at time of booking</p>
  <div class="footer">
    <p>Quote valid until: {{VALID_UNTIL}}</p>
    <p>{{ORG_NAME}} | Powered by RouteCraft</p>
  </div>
</body>
</html>`;
  }
}
