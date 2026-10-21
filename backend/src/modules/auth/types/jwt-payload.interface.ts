export interface JwtPayload {
  sub: string;
  email: string;
  pharmacyId: string;
  roles: string[];
  permissions: string[];
  type: 'access' | 'refresh';
  jti?: string;   // apenas refresh
  fam?: string;   // familyId — apenas refresh
}
