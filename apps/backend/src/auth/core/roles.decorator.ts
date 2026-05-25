import { SetMetadata } from "@nestjs/common";
import { ROLES_KEY } from "./auth.constants";

export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
