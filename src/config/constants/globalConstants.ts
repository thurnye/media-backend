export const GLOBAL_CONSTANTS = {
    ERROR_MESSAGE: {
        AUTH: {
            INVALID_LOGIN_CREDENTIALS: 'Wrong Email or Password',
            INVALID_CREDENTIALS:       'Invalid credentials',
            AUTHENTICATION_REQUIRED:   'Authentication required',
            UNAUTHORIZED:              'You must be logged in to perform this action',
            FORBIDDEN:                 'You do not have permission to perform this action',
        },
        USER: {
            USER_NOT_FOUND:       'User not found',
            EMAIL_ALREADY_IN_USE: 'Email already in use',
            MISSING_FIELDS:       'All required fields must be provided',
            INVALID_EMAIL:        'Invalid email address',
        },
        POST: {
            POST_NOT_FOUND:  'Post not found',
            MISSING_TITLE:   'Post title is required',
            NOT_OWNER:       'You can only modify your own posts',
        },
        WORKSPACE: {
            NOT_FOUND:             'Workspace not found',
            NOT_MEMBER:            'You are not a member of this workspace',
            MEMBER_ALREADY_EXISTS: 'User is already a member of this workspace',
            MEMBER_NOT_FOUND:      'Member not found in this workspace',
            OWNER_ONLY:            'Only the workspace owner can perform this action',
        },
        PLATFORM_ACCOUNT: {
            NOT_FOUND:         'Platform account not found',
            ALREADY_CONNECTED: 'This platform account is already connected to this workspace',
        },
        PLATFORM_POST: {
            NOT_FOUND: 'Platform post not found',
        },
        NETWORK_ERROR: {
            CONNECTION_FAILED: 'Something Went Wrong. Please try again',
            REQUEST_TIMEOUT:   'The request timed out. Please try again',
            SERVER_ERROR:      'An unexpected error occurred. Please try again',
        },
        GRAPHQL_ERROR: {
            BAD_USER_INPUT:    'Invalid input provided',
            INTERNAL_ERROR:    'An unexpected error occurred. Please try again',
            NOT_FOUND:         'The requested resource was not found',
        },
        PROTOCOL_ERROR: {
            BAD_REQUEST:          'The request could not be understood by the server',
            INVALID_CONTENT_TYPE: 'Content-Type must be application/json',
            METHOD_NOT_ALLOWED:   'HTTP method not allowed for this endpoint',
            PAYLOAD_TOO_LARGE:    'Request payload exceeds the allowed size limit',
        },
    },
    ERROR_CODE: {
        UNAUTHENTICATED:     'UNAUTHENTICATED',
        FORBIDDEN:           'FORBIDDEN',
        NOT_FOUND:           'NOT_FOUND',
        VALIDATION_ERROR:    'VALIDATION_ERROR',
        EMAIL_IN_USE:        'EMAIL_IN_USE',
        INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
        BAD_REQUEST:         'BAD_REQUEST',
        INTERNAL_ERROR:      'INTERNAL_ERROR',
    },
};
