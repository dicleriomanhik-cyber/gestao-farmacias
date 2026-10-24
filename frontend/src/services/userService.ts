import { apiClient } from "./api";
import type {
  ManagedUser,
  UserRequest,
  UserUpdateRequest,
  PaginatedResult,
  ListParams,
} from "../types/users";

interface Envelope<T> {
  success: true;
  data: T;
  timestamp: string;
}

interface PaginatedEnvelope<T> {
  success: true;
  data: {
    data: T[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  };
  timestamp: string;
}

export async function getUsers(params: ListParams = {}): Promise<PaginatedResult<ManagedUser>> {
  const resp = await apiClient.get<PaginatedEnvelope<ManagedUser>>("/users", {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    },
  });
  return resp.data.data;
}

export async function getUserById(id: string): Promise<ManagedUser> {
  const resp = await apiClient.get<Envelope<ManagedUser>>(`/users/${id}`);
  return resp.data.data;
}

export async function createUser(data: UserRequest): Promise<ManagedUser> {
  const resp = await apiClient.post<Envelope<ManagedUser>>("/users", data);
  return resp.data.data;
}

export async function updateUser(id: string, data: UserUpdateRequest): Promise<ManagedUser> {
  const resp = await apiClient.patch<Envelope<ManagedUser>>(`/users/${id}`, data);
  return resp.data.data;
}
