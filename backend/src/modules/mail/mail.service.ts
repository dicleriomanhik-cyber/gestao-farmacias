import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  private transporter() {
    const host = process.env.SMTP_HOST;
    if (!host) return null;
    const port = Number(process.env.SMTP_PORT ?? 587);
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? '' } : undefined,
    });
  }

  async sendPasswordReset(to: string, code: string): Promise<void> {
    const t = this.transporter();
    if (!t) {
      if (process.env.NODE_ENV === 'production') {
        this.logger.warn('Email de recuperacao nao enviado: SMTP nao configurado.');
      } else {
        this.logger.log('[DEV] Codigo de recuperacao para ' + to + ': ' + code);
      }
      return;
    }
    try {
      await t.sendMail({
        from: process.env.MAIL_FROM ?? process.env.SMTP_USER,
        to,
        subject: 'Recuperação da palavra-passe',
        text:
          'Recebemos um pedido para redefinir a palavra-passe da sua conta.\n\n' +
          'O seu código de confirmação (válido durante 15 minutos):\n' +
          code +
          '\n\nSe não fez este pedido, ignore este email.',
        html:
          '<p>Recebemos um pedido para redefinir a palavra-passe da sua conta.</p>' +
          '<p>O seu código de confirmação: <strong>' + code + '</strong> (válido durante 15 minutos).</p>' +
          '<p>Se não fez este pedido, ignore este email.</p>',
      });
    } catch (e) {
      this.logger.error('Falha ao enviar email para ' + to + ': ' + (e as Error).message);
    }
  }
}