export class UserMapper {
    static toResponse(user: any) {
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        type: user.type,
        firstName: user.firstName,
        lastName: user.lastName,
        
        readingLevel: user.readingLevel,
        responseLength: user.responseLength,
        learningStyle: user.learningStyle,
        interests: user.interests,
        gender:user.gender,
        blockedTopics: user.blockedTopics,
      };
    }
  }
