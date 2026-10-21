export interface AuthenticatedUser {
  id: string;
  email: string;
  pharmacyId: string;
  roles: string[];
  permissions: string[];
}
