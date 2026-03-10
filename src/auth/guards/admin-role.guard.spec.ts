import { ExecutionContext } from '@nestjs/common';
import { AdminRoleGuard } from './admin-role.guard';

describe('AdminRoleGuard', () => {
  const guard = new AdminRoleGuard();

  function createContext(role?: string): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user: role ? { role } : undefined,
        }),
      }),
    } as unknown as ExecutionContext;
  }

  it('allows ADMIN users', () => {
    expect(guard.canActivate(createContext('ADMIN'))).toBe(true);
  });

  it('blocks non-admin users', () => {
    expect(() => guard.canActivate(createContext('USER'))).toThrow(
      'Admin access required.',
    );
  });
});
