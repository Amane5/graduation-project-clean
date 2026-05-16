export class UserMapper {
    static toResponse(user: any) {
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        type: user.type,
        firstName: user.firstName,
        lastName: user.lastName,
      };
    }
  }
