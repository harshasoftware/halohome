/**
 * Send Report Email Edge Function
 * Sends astrocartography report PDFs to users via Resend
 */

import { corsHeaders } from '../_shared/cors.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

interface EmailRequest {
  to: string;
  subject?: string;
  userName?: string;
  reportType?: 'astrocartography' | 'natal-chart' | 'relocation';
  pdfBase64: string;
  pdfFileName?: string;
}

interface ResendEmailPayload {
  from: string;
  to: string[];
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: string;
  }>;
}

// Generate email HTML based on report type
function generateEmailHtml(userName: string, reportType: string): string {
  const reportNames: Record<string, string> = {
    'astrocartography': 'Astrocartography Report',
    'natal-chart': 'Natal Chart Report',
    'relocation': 'Relocation Analysis Report',
  };

  const reportName = reportNames[reportType] || 'Astrology Report';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${reportName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td>
        <!-- Header -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 16px 16px 0 0; padding: 32px;">
          <tr>
            <td align="center">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                HaloHome
              </h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                Your Cosmic Journey Awaits
              </p>
            </td>
          </tr>
        </table>

        <!-- Content -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #ffffff; padding: 32px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <tr>
            <td>
              <h2 style="margin: 0 0 16px 0; color: #18181b; font-size: 20px; font-weight: 600;">
                Hello${userName ? ` ${userName}` : ''}!
              </h2>

              <p style="margin: 0 0 24px 0; color: #52525b; font-size: 16px; line-height: 1.6;">
                Your personalized <strong>${reportName}</strong> is ready! We've attached it to this email as a PDF for your convenience.
              </p>

              <div style="background-color: #f4f4f5; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <p style="margin: 0; color: #71717a; font-size: 14px;">
                  <strong style="color: #18181b;">What's included:</strong>
                </p>
                <ul style="margin: 12px 0 0 0; padding-left: 20px; color: #52525b; font-size: 14px; line-height: 1.8;">
                  ${reportType === 'astrocartography' ? `
                    <li>Your planetary lines across the globe</li>
                    <li>Best locations for career, love, and growth</li>
                    <li>Detailed interpretations of key lines</li>
                    <li>Travel and relocation recommendations</li>
                  ` : reportType === 'natal-chart' ? `
                    <li>Complete natal chart analysis</li>
                    <li>Planet positions and aspects</li>
                    <li>House placements and meanings</li>
                    <li>Personalized insights</li>
                  ` : `
                    <li>Location-specific analysis</li>
                    <li>Planetary influences at your chosen location</li>
                    <li>Opportunities and challenges</li>
                    <li>Practical recommendations</li>
                  `}
                </ul>
              </div>

              <p style="margin: 0 0 24px 0; color: #52525b; font-size: 16px; line-height: 1.6;">
                Open your app anytime to explore your interactive astrocartography map and discover more cosmic insights.
              </p>

              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 8px;">
                    <a href="https://halohome.app" style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                      Open App
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding: 24px;">
          <tr>
            <td align="center">
              <p style="margin: 0 0 8px 0; color: #a1a1aa; font-size: 12px;">
                HaloHome - Astrocartography & Beyond
              </p>
              <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                Questions? Reply to this email or visit our app.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const {
      to,
      subject,
      userName,
      reportType = 'astrocartography',
      pdfBase64,
      pdfFileName,
    }: EmailRequest = await req.json();

    // Validate required fields
    if (!to || !pdfBase64) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, pdfBase64' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate email content
    const reportNames: Record<string, string> = {
      'astrocartography': 'Astrocartography Report',
      'natal-chart': 'Natal Chart Report',
      'relocation': 'Relocation Analysis Report',
    };
    const reportName = reportNames[reportType] || 'Astrology Report';
    const emailSubject = subject || `Your ${reportName} is Ready!`;
    const fileName = pdfFileName || `${reportType}-report.pdf`;

    // Build Resend email payload
    const emailPayload: ResendEmailPayload = {
      from: 'HaloHome <reports@tarotforge.xyz>',
      to: [to],
      subject: emailSubject,
      html: generateEmailHtml(userName || '', reportType),
      attachments: [
        {
          filename: fileName,
          content: pdfBase64,
        },
      ],
    };

    console.log(`Sending ${reportType} report to ${to}`);

    // Send email via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error('Resend API error:', errorText);
      // Return the actual Resend error for debugging
      return new Response(
        JSON.stringify({
          error: `Resend API error: ${errorText}`,
          status: resendResponse.status
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await resendResponse.json();
    console.log('Email sent successfully:', result.id);

    return new Response(
      JSON.stringify({
        success: true,
        messageId: result.id,
        message: `Report sent successfully to ${to}`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error sending email:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to send email' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
