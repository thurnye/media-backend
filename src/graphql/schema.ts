import { rootTypeDefs } from './typedefs/root.typedefs';

import { userTypes }      from './typedefs/types/user.types';
import { userQueries }    from './typedefs/queries/user.queries';
import { userMutations }  from './typedefs/mutations/user.mutations';

import { postTypes }      from './typedefs/types/post.types';
import { postQueries }    from './typedefs/queries/post.queries';
import { postMutations }  from './typedefs/mutations/post.mutations';

import { workspaceTypes }     from './typedefs/types/workspace.types';
import { workspaceQueries }   from './typedefs/queries/workspace.queries';
import { workspaceMutations } from './typedefs/mutations/workspace.mutations';

import { platformTypes }     from './typedefs/types/platform.types';
import { platformQueries }   from './typedefs/queries/platform.queries';
import { platformMutations } from './typedefs/mutations/platform.mutations';

import { userResolvers }      from './resolvers/user.resolvers';
import { postResolvers }      from './resolvers/post.resolvers';
import { workspaceResolvers } from './resolvers/workspace.resolvers';
import { platformResolvers }  from './resolvers/platform.resolvers';

export const typeDefs = [
  rootTypeDefs,
  userTypes,      userQueries,      userMutations,
  postTypes,      postQueries,      postMutations,
  workspaceTypes, workspaceQueries, workspaceMutations,
  platformTypes,  platformQueries,  platformMutations,
];

export const resolvers = [
  userResolvers,
  postResolvers,
  workspaceResolvers,
  platformResolvers,
];
