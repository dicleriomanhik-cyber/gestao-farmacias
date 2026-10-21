import { Injectable, Scope } from '@nestjs/common';

/**
 * Contexto por-request. Os serviços de dados devem usar `pharmacyId`
 * obtido daqui (populado por JwtStrategy a partir do BD), nunca do cliente.
 */
@Injectable({ scope: Scope.REQUEST })
export class TenantContext {
  private _pharmacyId: string | null = null;
  private _userId: string | null = null;

  set(pharmacyId: string, userId: string): void {
    this._pharmacyId = pharmacyId;
    this._userId = userId;
  }

  get pharmacyId(): string {
    if (!this._pharmacyId) throw new Error('TenantContext não inicializado.');
    return this._pharmacyId;
  }

  get userId(): string {
    if (!this._userId) throw new Error('TenantContext não inicializado.');
    return this._userId;
  }
}
