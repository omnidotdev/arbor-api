// @ts-nocheck
import { PgBooleanFilter, PgCondition, PgDeleteSingleStep, PgExecutor, PgOrFilter, TYPES, assertPgClassSingleStep, enumCodec, listOfCodec, makeRegistry, pgDeleteSingle, pgInsertSingle, pgSelectFromRecord, pgUpdateSingle, pgWhereConditionSpecListToSQL, recordCodec, sqlValueWithCodec } from "@dataplan/pg";
import { eq } from "drizzle-orm";
import { ConnectionStep, EdgeStep, ExecutableStep, Modifier, ObjectStep, __ValueStep, access, assertStep, bakedInputRuntime, connection, constant, context, createObjectAndApplyChildren, first, get as get2, inhibitOnNull, inspect, isStep, lambda, list, makeDecodeNodeId, makeGrafastSchema, markSyncAndSafe, object, rootValue, sideEffect, specFromNodeId } from "grafast";
import { GraphQLError, Kind } from "graphql";
import { dbPool } from "lib/db/db";
import { pullRequestTable, repositoryTable } from "lib/db/schema";
import { isWithinLimit } from "lib/entitlements";
import { gitService, repositoryService } from "lib/git";
import { FEATURE_KEYS, billingBypassOrgIds } from "lib/graphql/plugins/authorization/constants";
import { getOwnerSlug } from "lib/graphql/plugins/git/GitTypes.plugin";
import lib_providers from "lib/providers";
import { deletePullRequestFromIndex, deleteRepositoryFromIndex, indexPullRequest, indexRepository } from "lib/search";
import { sql } from "pg-sql2";
const rawNodeIdCodec = {
  name: "raw",
  encode: markSyncAndSafe(function rawEncode(value) {
    return typeof value === "string" ? value : null;
  }),
  decode: markSyncAndSafe(function rawDecode(value) {
    return typeof value === "string" ? value : null;
  })
};
const makeTableNodeIdHandler = ({
  typeName,
  nodeIdCodec,
  resource,
  identifier,
  pk,
  deprecationReason
}) => {
  return {
    typeName,
    codec: nodeIdCodec,
    plan($record) {
      return list([constant(identifier, !1), ...pk.map(attribute => $record.get(attribute))]);
    },
    getSpec($list) {
      return Object.fromEntries(pk.map((attribute, index) => [attribute, inhibitOnNull(access($list, [index + 1]))]));
    },
    getIdentifiers(value) {
      return value.slice(1);
    },
    get(spec) {
      return resource.get(spec);
    },
    match(obj) {
      return obj[0] === identifier;
    },
    deprecationReason
  };
};
const base64JSONNodeIdCodec = {
  name: "base64JSON",
  encode: markSyncAndSafe(function base64JSONEncode(value) {
    return Buffer.from(JSON.stringify(value), "utf8").toString("base64");
  }),
  decode: markSyncAndSafe(function base64JSONDecode(value) {
    return JSON.parse(Buffer.from(value, "base64").toString("utf8"));
  })
};
const executor = new PgExecutor({
  name: "main",
  context() {
    const ctx = context();
    return object({
      pgSettings: ctx.get("pgSettings"),
      withPgClient: ctx.get("withPgClient")
    });
  }
});
const repositoryRelationshipMetadataIdentifier = sql.identifier("public", "repository_relationship_metadata");
const spec_repositoryRelationshipMetadata = {
  name: "repositoryRelationshipMetadata",
  identifier: repositoryRelationshipMetadataIdentifier,
  attributes: {
    __proto__: null,
    id: {
      codec: TYPES.uuid,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    relationship_id: {
      codec: TYPES.uuid,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    key: {
      codec: TYPES.text,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    value: {
      codec: TYPES.text,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    created_at: {
      codec: TYPES.timestamptz,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    }
  },
  extensions: {
    oid: "310305",
    isTableLike: true,
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "repository_relationship_metadata"
    }
  },
  executor: executor
};
const repositoryRelationshipMetadataCodec = recordCodec(spec_repositoryRelationshipMetadata);
const externalDependencyIdentifier = sql.identifier("public", "external_dependency");
const spec_externalDependency = {
  name: "externalDependency",
  identifier: externalDependencyIdentifier,
  attributes: {
    __proto__: null,
    id: {
      codec: TYPES.uuid,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    repository_id: {
      codec: TYPES.uuid,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    package_manager: {
      codec: TYPES.text,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    package_name: {
      codec: TYPES.text,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    version_constraint: {
      codec: TYPES.text,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    detection_source: {
      codec: TYPES.text,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    created_at: {
      codec: TYPES.timestamptz,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    }
  },
  extensions: {
    oid: "310289",
    isTableLike: true,
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "external_dependency"
    }
  },
  executor: executor
};
const externalDependencyCodec = recordCodec(spec_externalDependency);
const repositoryCollaboratorIdentifier = sql.identifier("public", "repository_collaborator");
const permissionCodec = enumCodec({
  name: "permission",
  identifier: sql.identifier("public", "permission"),
  values: ["read", "write", "admin"],
  description: undefined,
  extensions: {
    oid: "310154",
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "permission"
    }
  }
});
const spec_repositoryCollaborator = {
  name: "repositoryCollaborator",
  identifier: repositoryCollaboratorIdentifier,
  attributes: {
    __proto__: null,
    repository_id: {
      codec: TYPES.uuid,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    user_id: {
      codec: TYPES.uuid,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    permission: {
      codec: permissionCodec,
      notNull: true,
      hasDefault: true,
      extensions: {
        tags: {
          behavior: "+orderBy"
        },
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    created_at: {
      codec: TYPES.timestamptz,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    updated_at: {
      codec: TYPES.timestamptz,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    }
  },
  extensions: {
    oid: "310215",
    isTableLike: true,
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "repository_collaborator"
    }
  },
  executor: executor
};
const repositoryCollaboratorCodec = recordCodec(spec_repositoryCollaborator);
const repositoryRelationshipTypeIdentifier = sql.identifier("public", "repository_relationship_type");
const spec_repositoryRelationshipType = {
  name: "repositoryRelationshipType",
  identifier: repositoryRelationshipTypeIdentifier,
  attributes: {
    __proto__: null,
    id: {
      codec: TYPES.uuid,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    name: {
      codec: TYPES.text,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    description: {
      codec: TYPES.text,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    is_directed: {
      codec: TYPES.boolean,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    organization_id: {
      codec: TYPES.uuid,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    created_at: {
      codec: TYPES.timestamptz,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    }
  },
  extensions: {
    oid: "310339",
    isTableLike: true,
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "repository_relationship_type"
    }
  },
  executor: executor
};
const repositoryRelationshipTypeCodec = recordCodec(spec_repositoryRelationshipType);
const pullRequestReviewIdentifier = sql.identifier("public", "pull_request_review");
const spec_pullRequestReview = {
  name: "pullRequestReview",
  identifier: pullRequestReviewIdentifier,
  attributes: {
    __proto__: null,
    id: {
      codec: TYPES.uuid,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    pull_request_id: {
      codec: TYPES.uuid,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    reviewer_id: {
      codec: TYPES.uuid,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    state: {
      codec: TYPES.text,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    body: {
      codec: TYPES.text,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    submitted_at: {
      codec: TYPES.timestamp,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    created_at: {
      codec: TYPES.timestamptz,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    updated_at: {
      codec: TYPES.timestamptz,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    }
  },
  extensions: {
    oid: "310503",
    isTableLike: true,
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "pull_request_review"
    }
  },
  executor: executor
};
const pullRequestReviewCodec = recordCodec(spec_pullRequestReview);
const userIdentifier = sql.identifier("public", "user");
const spec_user = {
  name: "user",
  identifier: userIdentifier,
  attributes: {
    __proto__: null,
    id: {
      codec: TYPES.uuid,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    identity_provider_id: {
      codec: TYPES.uuid,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    name: {
      codec: TYPES.text,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    avatar_url: {
      codec: TYPES.text,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    email: {
      codec: TYPES.text,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    created_at: {
      codec: TYPES.timestamptz,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    updated_at: {
      codec: TYPES.timestamptz,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    username: {
      codec: TYPES.text,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    bio: {
      codec: TYPES.text,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    }
  },
  extensions: {
    oid: "310112",
    isTableLike: true,
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "user"
    }
  },
  executor: executor
};
const userCodec = recordCodec(spec_user);
const pullRequestCommentIdentifier = sql.identifier("public", "pull_request_comment");
const spec_pullRequestComment = {
  name: "pullRequestComment",
  identifier: pullRequestCommentIdentifier,
  attributes: {
    __proto__: null,
    id: {
      codec: TYPES.uuid,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    pull_request_id: {
      codec: TYPES.uuid,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    author_id: {
      codec: TYPES.uuid,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    body: {
      codec: TYPES.text,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    path: {
      codec: TYPES.text,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    line: {
      codec: TYPES.int,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    side: {
      codec: TYPES.text,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    commit_sha: {
      codec: TYPES.text,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    reply_to_id: {
      codec: TYPES.uuid,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    created_at: {
      codec: TYPES.timestamptz,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    updated_at: {
      codec: TYPES.timestamptz,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    }
  },
  extensions: {
    oid: "310487",
    isTableLike: true,
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "pull_request_comment"
    }
  },
  executor: executor
};
const pullRequestCommentCodec = recordCodec(spec_pullRequestComment);
const repositoryRelationshipIdentifier = sql.identifier("public", "repository_relationship");
const spec_repositoryRelationship = {
  name: "repositoryRelationship",
  identifier: repositoryRelationshipIdentifier,
  attributes: {
    __proto__: null,
    id: {
      codec: TYPES.uuid,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    source_repository_id: {
      codec: TYPES.uuid,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    target_repository_id: {
      codec: TYPES.uuid,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    relationship_type_id: {
      codec: TYPES.uuid,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    detection_source: {
      codec: TYPES.text,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    confidence: {
      codec: TYPES.float4,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    version_constraint: {
      codec: TYPES.text,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    branch: {
      codec: TYPES.text,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    created_at: {
      codec: TYPES.timestamptz,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    updated_at: {
      codec: TYPES.timestamptz,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    }
  },
  extensions: {
    oid: "310319",
    isTableLike: true,
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "repository_relationship"
    }
  },
  executor: executor
};
const repositoryRelationshipCodec = recordCodec(spec_repositoryRelationship);
const organizationIdentifier = sql.identifier("public", "organization");
const spec_organization = {
  name: "organization",
  identifier: organizationIdentifier,
  attributes: {
    __proto__: null,
    id: {
      codec: TYPES.uuid,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    description: {
      codec: TYPES.text,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    avatar_url: {
      codec: TYPES.text,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    created_at: {
      codec: TYPES.timestamptz,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    updated_at: {
      codec: TYPES.timestamptz,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    idp_organization_id: {
      codec: TYPES.text,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    subscription_id: {
      codec: TYPES.text,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    billing_account_id: {
      codec: TYPES.text,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    deleted_at: {
      codec: TYPES.timestamp,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    deletion_reason: {
      codec: TYPES.text,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    }
  },
  extensions: {
    oid: "310163",
    isTableLike: true,
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "organization"
    }
  },
  executor: executor
};
const organizationCodec = recordCodec(spec_organization);
const repositoryIdentifier = sql.identifier("public", "repository");
const visibilityCodec = enumCodec({
  name: "visibility",
  identifier: sql.identifier("public", "visibility"),
  values: ["public", "private"],
  description: undefined,
  extensions: {
    oid: "310148",
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "visibility"
    }
  }
});
const spec_repository = {
  name: "repository",
  identifier: repositoryIdentifier,
  attributes: {
    __proto__: null,
    id: {
      codec: TYPES.uuid,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    owner_id: {
      codec: TYPES.uuid,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    organization_id: {
      codec: TYPES.uuid,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    name: {
      codec: TYPES.text,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    slug: {
      codec: TYPES.text,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    description: {
      codec: TYPES.text,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    visibility: {
      codec: visibilityCodec,
      notNull: true,
      hasDefault: true,
      extensions: {
        tags: {
          behavior: "+orderBy"
        },
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    default_branch: {
      codec: TYPES.text,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    created_at: {
      codec: TYPES.timestamptz,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    updated_at: {
      codec: TYPES.timestamptz,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    }
  },
  extensions: {
    oid: "310195",
    isTableLike: true,
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "repository"
    }
  },
  executor: executor
};
const repositoryCodec = recordCodec(spec_repository);
const pullRequestIdentifier = sql.identifier("public", "pull_request");
const spec_pullRequest = {
  name: "pullRequest",
  identifier: pullRequestIdentifier,
  attributes: {
    __proto__: null,
    id: {
      codec: TYPES.uuid,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    number: {
      codec: TYPES.int,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    repository_id: {
      codec: TYPES.uuid,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    author_id: {
      codec: TYPES.uuid,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    title: {
      codec: TYPES.text,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    description: {
      codec: TYPES.text,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    state: {
      codec: TYPES.text,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    source_branch: {
      codec: TYPES.text,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    target_branch: {
      codec: TYPES.text,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    merge_commit_sha: {
      codec: TYPES.text,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    merged_at: {
      codec: TYPES.timestamp,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    merged_by_id: {
      codec: TYPES.uuid,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    closed_at: {
      codec: TYPES.timestamp,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    created_at: {
      codec: TYPES.timestamptz,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    updated_at: {
      codec: TYPES.timestamptz,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    }
  },
  extensions: {
    oid: "310520",
    isTableLike: true,
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "pull_request"
    }
  },
  executor: executor
};
const pullRequestCodec = recordCodec(spec_pullRequest);
const repository_relationship_metadataUniques = [{
  attributes: ["id"],
  isPrimary: true
}];
const repository_relationship_metadata_resourceOptionsConfig = {
  executor: executor,
  name: "repository_relationship_metadata",
  identifier: "main.public.repository_relationship_metadata",
  from: repositoryRelationshipMetadataIdentifier,
  codec: repositoryRelationshipMetadataCodec,
  extensions: {
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "repository_relationship_metadata"
    },
    canSelect: true,
    canInsert: true,
    canUpdate: true,
    canDelete: true
  },
  uniques: repository_relationship_metadataUniques
};
const external_dependencyUniques = [{
  attributes: ["id"],
  isPrimary: true
}];
const external_dependency_resourceOptionsConfig = {
  executor: executor,
  name: "external_dependency",
  identifier: "main.public.external_dependency",
  from: externalDependencyIdentifier,
  codec: externalDependencyCodec,
  extensions: {
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "external_dependency"
    },
    canSelect: true,
    canInsert: true,
    canUpdate: true,
    canDelete: true
  },
  uniques: external_dependencyUniques
};
const repository_collaboratorUniques = [{
  attributes: ["repository_id", "user_id"],
  isPrimary: true
}];
const repository_collaborator_resourceOptionsConfig = {
  executor: executor,
  name: "repository_collaborator",
  identifier: "main.public.repository_collaborator",
  from: repositoryCollaboratorIdentifier,
  codec: repositoryCollaboratorCodec,
  extensions: {
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "repository_collaborator"
    },
    canSelect: true,
    canInsert: true,
    canUpdate: true,
    canDelete: true
  },
  uniques: repository_collaboratorUniques
};
const repository_relationship_typeUniques = [{
  attributes: ["id"],
  isPrimary: true
}];
const repository_relationship_type_resourceOptionsConfig = {
  executor: executor,
  name: "repository_relationship_type",
  identifier: "main.public.repository_relationship_type",
  from: repositoryRelationshipTypeIdentifier,
  codec: repositoryRelationshipTypeCodec,
  extensions: {
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "repository_relationship_type"
    },
    canSelect: true,
    canInsert: true,
    canUpdate: true,
    canDelete: true
  },
  uniques: repository_relationship_typeUniques
};
const pull_request_reviewUniques = [{
  attributes: ["id"],
  isPrimary: true
}];
const pull_request_review_resourceOptionsConfig = {
  executor: executor,
  name: "pull_request_review",
  identifier: "main.public.pull_request_review",
  from: pullRequestReviewIdentifier,
  codec: pullRequestReviewCodec,
  extensions: {
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "pull_request_review"
    },
    canSelect: true,
    canInsert: true,
    canUpdate: true,
    canDelete: true
  },
  uniques: pull_request_reviewUniques
};
const userUniques = [{
  attributes: ["id"],
  isPrimary: true
}, {
  attributes: ["email"],
  extensions: {
    tags: {
      __proto__: null,
      behavior: ["-update", "-delete"]
    }
  }
}, {
  attributes: ["identity_provider_id"],
  extensions: {
    tags: {
      __proto__: null,
      behavior: ["-update", "-delete"]
    }
  }
}, {
  attributes: ["username"],
  extensions: {
    tags: {
      __proto__: null,
      behavior: ["-update", "-delete"]
    }
  }
}];
const user_resourceOptionsConfig = {
  executor: executor,
  name: "user",
  identifier: "main.public.user",
  from: userIdentifier,
  codec: userCodec,
  extensions: {
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "user"
    },
    canSelect: true,
    canInsert: true,
    canUpdate: true,
    canDelete: true
  },
  uniques: userUniques
};
const pull_request_commentUniques = [{
  attributes: ["id"],
  isPrimary: true
}];
const pull_request_comment_resourceOptionsConfig = {
  executor: executor,
  name: "pull_request_comment",
  identifier: "main.public.pull_request_comment",
  from: pullRequestCommentIdentifier,
  codec: pullRequestCommentCodec,
  extensions: {
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "pull_request_comment"
    },
    canSelect: true,
    canInsert: true,
    canUpdate: true,
    canDelete: true
  },
  uniques: pull_request_commentUniques
};
const repository_relationshipUniques = [{
  attributes: ["id"],
  isPrimary: true
}];
const repository_relationship_resourceOptionsConfig = {
  executor: executor,
  name: "repository_relationship",
  identifier: "main.public.repository_relationship",
  from: repositoryRelationshipIdentifier,
  codec: repositoryRelationshipCodec,
  extensions: {
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "repository_relationship"
    },
    canSelect: true,
    canInsert: true,
    canUpdate: true,
    canDelete: true
  },
  uniques: repository_relationshipUniques
};
const organizationUniques = [{
  attributes: ["id"],
  isPrimary: true
}, {
  attributes: ["idp_organization_id"],
  extensions: {
    tags: {
      __proto__: null,
      behavior: ["-update", "-delete"]
    }
  }
}];
const organization_resourceOptionsConfig = {
  executor: executor,
  name: "organization",
  identifier: "main.public.organization",
  from: organizationIdentifier,
  codec: organizationCodec,
  extensions: {
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "organization"
    },
    canSelect: true,
    canInsert: true,
    canUpdate: true,
    canDelete: true
  },
  uniques: organizationUniques
};
const repositoryUniques = [{
  attributes: ["id"],
  isPrimary: true
}];
const repository_resourceOptionsConfig = {
  executor: executor,
  name: "repository",
  identifier: "main.public.repository",
  from: repositoryIdentifier,
  codec: repositoryCodec,
  extensions: {
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "repository"
    },
    canSelect: true,
    canInsert: true,
    canUpdate: true,
    canDelete: true
  },
  uniques: repositoryUniques
};
const pull_requestUniques = [{
  attributes: ["id"],
  isPrimary: true
}];
const pull_request_resourceOptionsConfig = {
  executor: executor,
  name: "pull_request",
  identifier: "main.public.pull_request",
  from: pullRequestIdentifier,
  codec: pullRequestCodec,
  extensions: {
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "pull_request"
    },
    canSelect: true,
    canInsert: true,
    canUpdate: true,
    canDelete: true
  },
  uniques: pull_requestUniques
};
const registryConfig = {
  pgExecutors: {
    __proto__: null,
    main: executor
  },
  pgCodecs: {
    __proto__: null,
    repositoryRelationshipMetadata: repositoryRelationshipMetadataCodec,
    uuid: TYPES.uuid,
    text: TYPES.text,
    timestamptz: TYPES.timestamptz,
    externalDependency: externalDependencyCodec,
    repositoryCollaborator: repositoryCollaboratorCodec,
    permission: permissionCodec,
    repositoryRelationshipType: repositoryRelationshipTypeCodec,
    bool: TYPES.boolean,
    pullRequestReview: pullRequestReviewCodec,
    timestamp: TYPES.timestamp,
    user: userCodec,
    pullRequestComment: pullRequestCommentCodec,
    int4: TYPES.int,
    repositoryRelationship: repositoryRelationshipCodec,
    float4: TYPES.float4,
    organization: organizationCodec,
    repository: repositoryCodec,
    visibility: visibilityCodec,
    pullRequest: pullRequestCodec
  },
  pgResources: {
    __proto__: null,
    repository_relationship_metadata: repository_relationship_metadata_resourceOptionsConfig,
    external_dependency: external_dependency_resourceOptionsConfig,
    repository_collaborator: repository_collaborator_resourceOptionsConfig,
    repository_relationship_type: repository_relationship_type_resourceOptionsConfig,
    pull_request_review: pull_request_review_resourceOptionsConfig,
    user: user_resourceOptionsConfig,
    pull_request_comment: pull_request_comment_resourceOptionsConfig,
    repository_relationship: repository_relationship_resourceOptionsConfig,
    organization: organization_resourceOptionsConfig,
    repository: repository_resourceOptionsConfig,
    pull_request: pull_request_resourceOptionsConfig
  },
  pgRelations: {
    __proto__: null,
    externalDependency: {
      __proto__: null,
      repositoryByMyRepositoryId: {
        localCodec: externalDependencyCodec,
        remoteResourceOptions: repository_resourceOptionsConfig,
        localAttributes: ["repository_id"],
        remoteAttributes: ["id"],
        isUnique: true
      }
    },
    organization: {
      __proto__: null,
      repositoriesByTheirOrganizationId: {
        localCodec: organizationCodec,
        remoteResourceOptions: repository_resourceOptionsConfig,
        localAttributes: ["id"],
        remoteAttributes: ["organization_id"],
        isReferencee: true
      },
      repositoryRelationshipTypesByTheirOrganizationId: {
        localCodec: organizationCodec,
        remoteResourceOptions: repository_relationship_type_resourceOptionsConfig,
        localAttributes: ["id"],
        remoteAttributes: ["organization_id"],
        isReferencee: true
      }
    },
    pullRequest: {
      __proto__: null,
      userByMyAuthorId: {
        localCodec: pullRequestCodec,
        remoteResourceOptions: user_resourceOptionsConfig,
        localAttributes: ["author_id"],
        remoteAttributes: ["id"],
        isUnique: true
      },
      userByMyMergedById: {
        localCodec: pullRequestCodec,
        remoteResourceOptions: user_resourceOptionsConfig,
        localAttributes: ["merged_by_id"],
        remoteAttributes: ["id"],
        isUnique: true
      },
      repositoryByMyRepositoryId: {
        localCodec: pullRequestCodec,
        remoteResourceOptions: repository_resourceOptionsConfig,
        localAttributes: ["repository_id"],
        remoteAttributes: ["id"],
        isUnique: true
      },
      pullRequestCommentsByTheirPullRequestId: {
        localCodec: pullRequestCodec,
        remoteResourceOptions: pull_request_comment_resourceOptionsConfig,
        localAttributes: ["id"],
        remoteAttributes: ["pull_request_id"],
        isReferencee: true
      },
      pullRequestReviewsByTheirPullRequestId: {
        localCodec: pullRequestCodec,
        remoteResourceOptions: pull_request_review_resourceOptionsConfig,
        localAttributes: ["id"],
        remoteAttributes: ["pull_request_id"],
        isReferencee: true
      }
    },
    pullRequestComment: {
      __proto__: null,
      userByMyAuthorId: {
        localCodec: pullRequestCommentCodec,
        remoteResourceOptions: user_resourceOptionsConfig,
        localAttributes: ["author_id"],
        remoteAttributes: ["id"],
        isUnique: true
      },
      pullRequestByMyPullRequestId: {
        localCodec: pullRequestCommentCodec,
        remoteResourceOptions: pull_request_resourceOptionsConfig,
        localAttributes: ["pull_request_id"],
        remoteAttributes: ["id"],
        isUnique: true
      }
    },
    pullRequestReview: {
      __proto__: null,
      pullRequestByMyPullRequestId: {
        localCodec: pullRequestReviewCodec,
        remoteResourceOptions: pull_request_resourceOptionsConfig,
        localAttributes: ["pull_request_id"],
        remoteAttributes: ["id"],
        isUnique: true
      },
      userByMyReviewerId: {
        localCodec: pullRequestReviewCodec,
        remoteResourceOptions: user_resourceOptionsConfig,
        localAttributes: ["reviewer_id"],
        remoteAttributes: ["id"],
        isUnique: true
      }
    },
    repository: {
      __proto__: null,
      organizationByMyOrganizationId: {
        localCodec: repositoryCodec,
        remoteResourceOptions: organization_resourceOptionsConfig,
        localAttributes: ["organization_id"],
        remoteAttributes: ["id"],
        isUnique: true
      },
      userByMyOwnerId: {
        localCodec: repositoryCodec,
        remoteResourceOptions: user_resourceOptionsConfig,
        localAttributes: ["owner_id"],
        remoteAttributes: ["id"],
        isUnique: true
      },
      repositoryCollaboratorsByTheirRepositoryId: {
        localCodec: repositoryCodec,
        remoteResourceOptions: repository_collaborator_resourceOptionsConfig,
        localAttributes: ["id"],
        remoteAttributes: ["repository_id"],
        isReferencee: true
      },
      externalDependenciesByTheirRepositoryId: {
        localCodec: repositoryCodec,
        remoteResourceOptions: external_dependency_resourceOptionsConfig,
        localAttributes: ["id"],
        remoteAttributes: ["repository_id"],
        isReferencee: true
      },
      repositoryRelationshipsByTheirSourceRepositoryId: {
        localCodec: repositoryCodec,
        remoteResourceOptions: repository_relationship_resourceOptionsConfig,
        localAttributes: ["id"],
        remoteAttributes: ["source_repository_id"],
        isReferencee: true
      },
      repositoryRelationshipsByTheirTargetRepositoryId: {
        localCodec: repositoryCodec,
        remoteResourceOptions: repository_relationship_resourceOptionsConfig,
        localAttributes: ["id"],
        remoteAttributes: ["target_repository_id"],
        isReferencee: true
      },
      pullRequestsByTheirRepositoryId: {
        localCodec: repositoryCodec,
        remoteResourceOptions: pull_request_resourceOptionsConfig,
        localAttributes: ["id"],
        remoteAttributes: ["repository_id"],
        isReferencee: true
      }
    },
    repositoryCollaborator: {
      __proto__: null,
      repositoryByMyRepositoryId: {
        localCodec: repositoryCollaboratorCodec,
        remoteResourceOptions: repository_resourceOptionsConfig,
        localAttributes: ["repository_id"],
        remoteAttributes: ["id"],
        isUnique: true
      },
      userByMyUserId: {
        localCodec: repositoryCollaboratorCodec,
        remoteResourceOptions: user_resourceOptionsConfig,
        localAttributes: ["user_id"],
        remoteAttributes: ["id"],
        isUnique: true
      }
    },
    repositoryRelationship: {
      __proto__: null,
      repositoryRelationshipTypeByMyRelationshipTypeId: {
        localCodec: repositoryRelationshipCodec,
        remoteResourceOptions: repository_relationship_type_resourceOptionsConfig,
        localAttributes: ["relationship_type_id"],
        remoteAttributes: ["id"],
        isUnique: true
      },
      repositoryByMySourceRepositoryId: {
        localCodec: repositoryRelationshipCodec,
        remoteResourceOptions: repository_resourceOptionsConfig,
        localAttributes: ["source_repository_id"],
        remoteAttributes: ["id"],
        isUnique: true
      },
      repositoryByMyTargetRepositoryId: {
        localCodec: repositoryRelationshipCodec,
        remoteResourceOptions: repository_resourceOptionsConfig,
        localAttributes: ["target_repository_id"],
        remoteAttributes: ["id"],
        isUnique: true
      },
      repositoryRelationshipMetadataByTheirRelationshipId: {
        localCodec: repositoryRelationshipCodec,
        remoteResourceOptions: repository_relationship_metadata_resourceOptionsConfig,
        localAttributes: ["id"],
        remoteAttributes: ["relationship_id"],
        isReferencee: true
      }
    },
    repositoryRelationshipMetadata: {
      __proto__: null,
      repositoryRelationshipByMyRelationshipId: {
        localCodec: repositoryRelationshipMetadataCodec,
        remoteResourceOptions: repository_relationship_resourceOptionsConfig,
        localAttributes: ["relationship_id"],
        remoteAttributes: ["id"],
        isUnique: true
      }
    },
    repositoryRelationshipType: {
      __proto__: null,
      organizationByMyOrganizationId: {
        localCodec: repositoryRelationshipTypeCodec,
        remoteResourceOptions: organization_resourceOptionsConfig,
        localAttributes: ["organization_id"],
        remoteAttributes: ["id"],
        isUnique: true
      },
      repositoryRelationshipsByTheirRelationshipTypeId: {
        localCodec: repositoryRelationshipTypeCodec,
        remoteResourceOptions: repository_relationship_resourceOptionsConfig,
        localAttributes: ["id"],
        remoteAttributes: ["relationship_type_id"],
        isReferencee: true
      }
    },
    user: {
      __proto__: null,
      repositoriesByTheirOwnerId: {
        localCodec: userCodec,
        remoteResourceOptions: repository_resourceOptionsConfig,
        localAttributes: ["id"],
        remoteAttributes: ["owner_id"],
        isReferencee: true
      },
      repositoryCollaboratorsByTheirUserId: {
        localCodec: userCodec,
        remoteResourceOptions: repository_collaborator_resourceOptionsConfig,
        localAttributes: ["id"],
        remoteAttributes: ["user_id"],
        isReferencee: true
      },
      pullRequestCommentsByTheirAuthorId: {
        localCodec: userCodec,
        remoteResourceOptions: pull_request_comment_resourceOptionsConfig,
        localAttributes: ["id"],
        remoteAttributes: ["author_id"],
        isReferencee: true
      },
      pullRequestReviewsByTheirReviewerId: {
        localCodec: userCodec,
        remoteResourceOptions: pull_request_review_resourceOptionsConfig,
        localAttributes: ["id"],
        remoteAttributes: ["reviewer_id"],
        isReferencee: true
      },
      pullRequestsByTheirAuthorId: {
        localCodec: userCodec,
        remoteResourceOptions: pull_request_resourceOptionsConfig,
        localAttributes: ["id"],
        remoteAttributes: ["author_id"],
        isReferencee: true
      },
      pullRequestsByTheirMergedById: {
        localCodec: userCodec,
        remoteResourceOptions: pull_request_resourceOptionsConfig,
        localAttributes: ["id"],
        remoteAttributes: ["merged_by_id"],
        isReferencee: true
      }
    }
  }
};
const registry = makeRegistry(registryConfig);
const spec_resource_repository_relationship_metadataPgResource = registry.pgResources["repository_relationship_metadata"];
const nodeIdHandler_RepositoryRelationshipMetadatum = makeTableNodeIdHandler({
  typeName: "RepositoryRelationshipMetadatum",
  identifier: "RepositoryRelationshipMetadatum",
  nodeIdCodec: base64JSONNodeIdCodec,
  resource: spec_resource_repository_relationship_metadataPgResource,
  pk: repository_relationship_metadataUniques[0].attributes
});
const spec_resource_external_dependencyPgResource = registry.pgResources["external_dependency"];
const nodeIdHandler_ExternalDependency = makeTableNodeIdHandler({
  typeName: "ExternalDependency",
  identifier: "ExternalDependency",
  nodeIdCodec: base64JSONNodeIdCodec,
  resource: spec_resource_external_dependencyPgResource,
  pk: external_dependencyUniques[0].attributes
});
const spec_resource_repository_collaboratorPgResource = registry.pgResources["repository_collaborator"];
const nodeIdHandler_RepositoryCollaborator = makeTableNodeIdHandler({
  typeName: "RepositoryCollaborator",
  identifier: "RepositoryCollaborator",
  nodeIdCodec: base64JSONNodeIdCodec,
  resource: spec_resource_repository_collaboratorPgResource,
  pk: repository_collaboratorUniques[0].attributes
});
const spec_resource_repository_relationship_typePgResource = registry.pgResources["repository_relationship_type"];
const nodeIdHandler_RepositoryRelationshipType = makeTableNodeIdHandler({
  typeName: "RepositoryRelationshipType",
  identifier: "RepositoryRelationshipType",
  nodeIdCodec: base64JSONNodeIdCodec,
  resource: spec_resource_repository_relationship_typePgResource,
  pk: repository_relationship_typeUniques[0].attributes
});
const spec_resource_pull_request_reviewPgResource = registry.pgResources["pull_request_review"];
const nodeIdHandler_PullRequestReview = makeTableNodeIdHandler({
  typeName: "PullRequestReview",
  identifier: "PullRequestReview",
  nodeIdCodec: base64JSONNodeIdCodec,
  resource: spec_resource_pull_request_reviewPgResource,
  pk: pull_request_reviewUniques[0].attributes
});
const spec_resource_userPgResource = registry.pgResources["user"];
const nodeIdHandler_User = makeTableNodeIdHandler({
  typeName: "User",
  identifier: "User",
  nodeIdCodec: base64JSONNodeIdCodec,
  resource: spec_resource_userPgResource,
  pk: userUniques[0].attributes
});
const spec_resource_pull_request_commentPgResource = registry.pgResources["pull_request_comment"];
const nodeIdHandler_PullRequestComment = makeTableNodeIdHandler({
  typeName: "PullRequestComment",
  identifier: "PullRequestComment",
  nodeIdCodec: base64JSONNodeIdCodec,
  resource: spec_resource_pull_request_commentPgResource,
  pk: pull_request_commentUniques[0].attributes
});
const spec_resource_repository_relationshipPgResource = registry.pgResources["repository_relationship"];
const nodeIdHandler_RepositoryRelationship = makeTableNodeIdHandler({
  typeName: "RepositoryRelationship",
  identifier: "RepositoryRelationship",
  nodeIdCodec: base64JSONNodeIdCodec,
  resource: spec_resource_repository_relationshipPgResource,
  pk: repository_relationshipUniques[0].attributes
});
const spec_resource_organizationPgResource = registry.pgResources["organization"];
const nodeIdHandler_Organization = makeTableNodeIdHandler({
  typeName: "Organization",
  identifier: "Organization",
  nodeIdCodec: base64JSONNodeIdCodec,
  resource: spec_resource_organizationPgResource,
  pk: organizationUniques[0].attributes
});
const spec_resource_repositoryPgResource = registry.pgResources["repository"];
const nodeIdHandler_Repository = makeTableNodeIdHandler({
  typeName: "Repository",
  identifier: "Repository",
  nodeIdCodec: base64JSONNodeIdCodec,
  resource: spec_resource_repositoryPgResource,
  pk: repositoryUniques[0].attributes
});
const spec_resource_pull_requestPgResource = registry.pgResources["pull_request"];
const nodeIdHandler_PullRequest = makeTableNodeIdHandler({
  typeName: "PullRequest",
  identifier: "PullRequest",
  nodeIdCodec: base64JSONNodeIdCodec,
  resource: spec_resource_pull_requestPgResource,
  pk: pull_requestUniques[0].attributes
});
const nodeIdHandlerByTypeName = {
  __proto__: null,
  Query: {
    typeName: "Query",
    codec: rawNodeIdCodec,
    match(specifier) {
      return specifier === "query";
    },
    getIdentifiers(_value) {
      return [];
    },
    getSpec() {
      return "irrelevant";
    },
    get() {
      return rootValue();
    },
    plan() {
      return constant`query`;
    }
  },
  RepositoryRelationshipMetadatum: nodeIdHandler_RepositoryRelationshipMetadatum,
  ExternalDependency: nodeIdHandler_ExternalDependency,
  RepositoryCollaborator: nodeIdHandler_RepositoryCollaborator,
  RepositoryRelationshipType: nodeIdHandler_RepositoryRelationshipType,
  PullRequestReview: nodeIdHandler_PullRequestReview,
  User: nodeIdHandler_User,
  PullRequestComment: nodeIdHandler_PullRequestComment,
  RepositoryRelationship: nodeIdHandler_RepositoryRelationship,
  Organization: nodeIdHandler_Organization,
  Repository: nodeIdHandler_Repository,
  PullRequest: nodeIdHandler_PullRequest
};
const decodeNodeId = makeDecodeNodeId(Object.values(nodeIdHandlerByTypeName));
function findTypeNameMatch(specifier) {
  if (!specifier) return null;
  for (const [typeName, typeSpec] of Object.entries(nodeIdHandlerByTypeName)) {
    const value = specifier[typeSpec.codec.name];
    if (value != null && typeSpec.match(value)) return typeName;
  }
  console.warn(`Could not find a type that matched the specifier '${inspect(specifier)}'`);
  return null;
}
const nodeIdCodecs = {
  __proto__: null,
  raw: rawNodeIdCodec,
  base64JSON: base64JSONNodeIdCodec,
  pipeString: {
    name: "pipeString",
    encode: markSyncAndSafe(function pipeStringEncode(value) {
      return Array.isArray(value) ? value.join("|") : null;
    }),
    decode: markSyncAndSafe(function pipeStringDecode(value) {
      return typeof value === "string" ? value.split("|") : null;
    })
  }
};
const RepositoryRelationshipMetadatum_rowIdPlan = $record => {
  return $record.get("id");
};
const RepositoryRelationshipMetadatum_createdAtPlan = $record => {
  return $record.get("created_at");
};
function toString(value) {
  return "" + value;
}
const coerce = string => {
  if (!/^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(string)) throw new GraphQLError("Invalid UUID, expected 32 hexadecimal characters, optionally with hyphens");
  return string;
};
const RepositoryRelationship_detectionSourcePlan = $record => {
  return $record.get("detection_source");
};
const RepositoryRelationship_versionConstraintPlan = $record => {
  return $record.get("version_constraint");
};
const RepositoryRelationship_updatedAtPlan = $record => {
  return $record.get("updated_at");
};
function applyFirstArg(_, $connection, arg) {
  $connection.setFirst(arg.getRaw());
}
function applyLastArg(_, $connection, val) {
  $connection.setLast(val.getRaw());
}
function applyOffsetArg(_, $connection, val) {
  $connection.setOffset(val.getRaw());
}
function applyBeforeArg(_, $connection, val) {
  $connection.setBefore(val.getRaw());
}
function applyAfterArg(_, $connection, val) {
  $connection.setAfter(val.getRaw());
}
function qbWhereBuilder(qb) {
  return qb.whereBuilder();
}
const applyConditionArgToConnection = (_condition, $connection, arg) => {
  const $select = $connection.getSubplan();
  arg.apply($select, qbWhereBuilder);
};
function isEmpty(o) {
  return typeof o === "object" && o !== null && Object.keys(o).length === 0;
}
function assertAllowed(value, mode) {
  if (mode === "object" && !true && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
  if (mode === "list" && !true) {
    const arr = value;
    if (arr) {
      const l = arr.length;
      for (let i = 0; i < l; i++) if (isEmpty(arr[i])) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
    }
  }
  if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
}
function RepositoryRelationship_repositoryRelationshipMetadataByRelationshipIdfilterApplyPlan(_, $connection, fieldArg) {
  const $pgSelect = $connection.getSubplan();
  fieldArg.apply($pgSelect, (queryBuilder, value) => {
    assertAllowed(value, "object");
    if (value == null) return;
    const condition = new PgCondition(queryBuilder);
    return condition;
  });
}
function applyOrderByArgToConnection(parent, $connection, value) {
  const $select = $connection.getSubplan();
  value.apply($select);
}
const RepositoryRelationshipType_organizationIdPlan = $record => {
  return $record.get("organization_id");
};
const RepositoryRelationshipType_organizationPlan = $record => spec_resource_organizationPgResource.get({
  id: $record.get("organization_id")
});
const Organization_avatarUrlPlan = $record => {
  return $record.get("avatar_url");
};
const totalCountConnectionPlan = $connection => $connection.cloneSubplanWithoutPagination("aggregate").singleAsRecord().select(sql`count(*)`, TYPES.bigint, !1);
function pgAggregatesCloneSubplanWithoutPaginationSingle($connection) {
  return $connection.cloneSubplanWithoutPagination("aggregate").single();
}
function pgAggregateCloneSubplanWithoutPaginationAsAggregate($connection) {
  return $connection.cloneSubplanWithoutPagination("aggregate");
}
function pgAggregatesApplyGroupedAggregate(_$parent, $pgSelect, input) {
  return input.apply($pgSelect);
}
function pgAggregatesApplyConditionsToGroupedAggregates(_$parent, $pgSelect, input) {
  return input.apply($pgSelect, queryBuilder => queryBuilder.havingBuilder());
}
function applyAttributeCondition(attributeName, attributeCodec, $condition, val) {
  $condition.where({
    type: "attribute",
    attribute: attributeName,
    callback(expression) {
      return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, attributeCodec)}`;
    }
  });
}
const RepositoryCondition_rowIdApply = ($condition, val) => applyAttributeCondition("id", TYPES.uuid, $condition, val);
const RepositoryCondition_organizationIdApply = ($condition, val) => applyAttributeCondition("organization_id", TYPES.uuid, $condition, val);
const RepositoryCondition_nameApply = ($condition, val) => applyAttributeCondition("name", TYPES.text, $condition, val);
const RepositoryCondition_descriptionApply = ($condition, val) => applyAttributeCondition("description", TYPES.text, $condition, val);
const RepositoryCondition_createdAtApply = ($condition, val) => applyAttributeCondition("created_at", TYPES.timestamptz, $condition, val);
const RepositoryCondition_updatedAtApply = ($condition, val) => applyAttributeCondition("updated_at", TYPES.timestamptz, $condition, val);
const pgConnectionFilterApplyAttribute = (fieldName, attributeName, attribute, queryBuilder, value) => {
  if (value === void 0) return;
  if (!true && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
  if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
  const condition = new PgCondition(queryBuilder);
  condition.extensions.pgFilterAttribute = {
    fieldName,
    attributeName,
    attribute
  };
  return condition;
};
const pgConnectionFilterApplySingleRelation = (foreignTable, foreignTableExpression, localAttributes, remoteAttributes, $where, value) => {
  assertAllowed(value, "object");
  if (value == null) return;
  const $subQuery = $where.existsPlan({
    tableExpression: foreignTableExpression,
    alias: foreignTable.name
  });
  localAttributes.forEach((localAttribute, i) => {
    const remoteAttribute = remoteAttributes[i];
    $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
  });
  $subQuery.ignoreUnlessAmended();
  return $subQuery;
};
const pgConnectionFilterApplyForwardRelationExists = (foreignTable, foreignTableExpression, localAttributes, remoteAttributes, $where, value) => {
  assertAllowed(value, "scalar");
  if (value == null) return;
  const $subQuery = $where.existsPlan({
    tableExpression: foreignTableExpression,
    alias: foreignTable.name,
    equals: value
  });
  localAttributes.forEach((localAttribute, i) => {
    const remoteAttribute = remoteAttributes[i];
    $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
  });
};
function RepositoryFilter_andApply($where, value) {
  assertAllowed(value, "list");
  if (value == null) return;
  return $where.andPlan();
}
function RepositoryFilter_orApply($where, value) {
  assertAllowed(value, "list");
  if (value == null) return;
  const $or = $where.orPlan();
  return () => $or.andPlan();
}
function RepositoryFilter_notApply($where, value) {
  assertAllowed(value, "object");
  if (value == null) return;
  return $where.notPlan().andPlan();
}
const pgConnectionFilterApplyFromOperator = (fieldName, resolve, resolveInput, resolveInputCodec, resolveSqlIdentifier, resolveSqlValue, $where, value) => {
  if (!$where.extensions?.pgFilterAttribute) throw Error("Planning error: expected 'pgFilterAttribute' to be present on the $where plan's extensions; your extensions to `postgraphile-plugin-connection-filter` does not implement the required interfaces.");
  if (value === void 0) return;
  const {
      fieldName: parentFieldName,
      attributeName,
      attribute,
      codec,
      expression
    } = $where.extensions.pgFilterAttribute,
    sourceAlias = attribute ? attribute.expression ? attribute.expression($where.alias) : sql`${$where.alias}.${sql.identifier(attributeName)}` : expression ? expression : $where.alias,
    sourceCodec = codec ?? attribute.codec,
    [sqlIdentifier, identifierCodec] = resolveSqlIdentifier ? resolveSqlIdentifier(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
  if (value === null) return;
  if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
  const resolvedInput = resolveInput ? resolveInput(value) : value,
    inputCodec = resolveInputCodec ? resolveInputCodec(codec ?? attribute.codec) : codec ?? attribute.codec,
    sqlValue = resolveSqlValue ? resolveSqlValue($where, value, inputCodec) : sqlValueWithCodec(resolvedInput, inputCodec),
    fragment = resolve(sqlIdentifier, sqlValue, value, $where, {
      fieldName: parentFieldName ?? null,
      operatorName: fieldName
    });
  $where.where(fragment);
};
const resolveIsNull = (i, _v, input) => sql`${i} ${input ? sql`IS NULL` : sql`IS NOT NULL`}`;
const resolveBoolean = () => TYPES.boolean;
const resolveSqlValue_null = () => sql.null;
function pgAggregatesApply_isNull($where, value) {
  return pgConnectionFilterApplyFromOperator("isNull", resolveIsNull, undefined, resolveBoolean, undefined, resolveSqlValue_null, $where, value);
}
const resolveEquality = (i, v) => sql`${i} = ${v}`;
const forceTextTypesSensitive = [TYPES.citext, TYPES.char, TYPES.bpchar];
function resolveDomains(c) {
  let current = c;
  while (current.domainOfCodec) current = current.domainOfCodec;
  return current;
}
function resolveInputCodecSensitive(c) {
  if (c.arrayOfCodec) {
    if (forceTextTypesSensitive.includes(resolveDomains(c.arrayOfCodec))) return listOfCodec(TYPES.text, {
      extensions: {
        listItemNonNull: c.extensions?.listItemNonNull
      }
    });
    return c;
  } else {
    if (forceTextTypesSensitive.includes(resolveDomains(c))) return TYPES.text;
    return c;
  }
}
function resolveSqlIdentifierSensitive(identifier, c) {
  if (c.arrayOfCodec && forceTextTypesSensitive.includes(resolveDomains(c.arrayOfCodec))) return [sql`(${identifier})::text[]`, listOfCodec(TYPES.text, {
    extensions: {
      listItemNonNull: c.extensions?.listItemNonNull
    }
  })];else if (forceTextTypesSensitive.includes(resolveDomains(c))) return [sql`(${identifier})::text`, TYPES.text];else return [identifier, c];
}
function pgAggregatesApply_equalTo($where, value) {
  return pgConnectionFilterApplyFromOperator("equalTo", resolveEquality, undefined, resolveInputCodecSensitive, resolveSqlIdentifierSensitive, undefined, $where, value);
}
const resolveInequality = (i, v) => sql`${i} <> ${v}`;
function pgAggregatesApply_notEqualTo($where, value) {
  return pgConnectionFilterApplyFromOperator("notEqualTo", resolveInequality, undefined, resolveInputCodecSensitive, resolveSqlIdentifierSensitive, undefined, $where, value);
}
const resolveDistinct = (i, v) => sql`${i} IS DISTINCT FROM ${v}`;
function pgAggregatesApply_distinctFrom($where, value) {
  return pgConnectionFilterApplyFromOperator("distinctFrom", resolveDistinct, undefined, resolveInputCodecSensitive, resolveSqlIdentifierSensitive, undefined, $where, value);
}
const resolveNotDistinct = (i, v) => sql`${i} IS NOT DISTINCT FROM ${v}`;
function pgAggregatesApply_notDistinctFrom($where, value) {
  return pgConnectionFilterApplyFromOperator("notDistinctFrom", resolveNotDistinct, undefined, resolveInputCodecSensitive, resolveSqlIdentifierSensitive, undefined, $where, value);
}
const resolveEqualsAny = (i, v) => sql`${i} = ANY(${v})`;
function resolveArrayInputCodecSensitive(c) {
  if (forceTextTypesSensitive.includes(resolveDomains(c))) return listOfCodec(TYPES.text, {
    extensions: {
      listItemNonNull: !0
    }
  });else return listOfCodec(c, {
    extensions: {
      listItemNonNull: !0
    }
  });
}
function pgAggregatesApply_in($where, value) {
  return pgConnectionFilterApplyFromOperator("in", resolveEqualsAny, undefined, resolveArrayInputCodecSensitive, resolveSqlIdentifierSensitive, undefined, $where, value);
}
const resolveInequalAll = (i, v) => sql`${i} <> ALL(${v})`;
function pgAggregatesApply_notIn($where, value) {
  return pgConnectionFilterApplyFromOperator("notIn", resolveInequalAll, undefined, resolveArrayInputCodecSensitive, resolveSqlIdentifierSensitive, undefined, $where, value);
}
const resolveLessThan = (i, v) => sql`${i} < ${v}`;
function pgAggregatesApply_lessThan($where, value) {
  return pgConnectionFilterApplyFromOperator("lessThan", resolveLessThan, undefined, resolveInputCodecSensitive, resolveSqlIdentifierSensitive, undefined, $where, value);
}
const resolveLessThanOrEqualTo = (i, v) => sql`${i} <= ${v}`;
function pgAggregatesApply_lessThanOrEqualTo($where, value) {
  return pgConnectionFilterApplyFromOperator("lessThanOrEqualTo", resolveLessThanOrEqualTo, undefined, resolveInputCodecSensitive, resolveSqlIdentifierSensitive, undefined, $where, value);
}
const resolveGreaterThan = (i, v) => sql`${i} > ${v}`;
function pgAggregatesApply_greaterThan($where, value) {
  return pgConnectionFilterApplyFromOperator("greaterThan", resolveGreaterThan, undefined, resolveInputCodecSensitive, resolveSqlIdentifierSensitive, undefined, $where, value);
}
const resolveGreaterThanOrEqualTo = (i, v) => sql`${i} >= ${v}`;
function pgAggregatesApply_greaterThanOrEqualTo($where, value) {
  return pgConnectionFilterApplyFromOperator("greaterThanOrEqualTo", resolveGreaterThanOrEqualTo, undefined, resolveInputCodecSensitive, resolveSqlIdentifierSensitive, undefined, $where, value);
}
const resolveLike = (i, v) => sql`${i} LIKE ${v}`;
function escapeLikeWildcards(input) {
  if (typeof input !== "string") throw Error("Non-string input was provided to escapeLikeWildcards");else return input.split("%").join("\\%").split("_").join("\\_");
}
const resolveInputContains = input => `%${escapeLikeWildcards(input)}%`;
const resolveNotLike = (i, v) => sql`${i} NOT LIKE ${v}`;
const resolveILike = (i, v) => sql`${i} ILIKE ${v}`;
const forceTextTypesInsensitive = [TYPES.char, TYPES.bpchar];
function resolveInputCodecInsensitive(c) {
  if (c.arrayOfCodec) {
    if (forceTextTypesInsensitive.includes(resolveDomains(c.arrayOfCodec))) return listOfCodec(TYPES.text, {
      extensions: {
        listItemNonNull: c.extensions?.listItemNonNull
      }
    });
    return c;
  } else {
    if (forceTextTypesInsensitive.includes(resolveDomains(c))) return TYPES.text;
    return c;
  }
}
function resolveSqlIdentifierInsensitive(identifier, c) {
  if (c.arrayOfCodec && forceTextTypesInsensitive.includes(resolveDomains(c.arrayOfCodec))) return [sql`(${identifier})::text[]`, listOfCodec(TYPES.text, {
    extensions: {
      listItemNonNull: c.extensions?.listItemNonNull
    }
  })];else if (forceTextTypesInsensitive.includes(resolveDomains(c))) return [sql`(${identifier})::text`, TYPES.text];else return [identifier, c];
}
const resolveNotILike = (i, v) => sql`${i} NOT ILIKE ${v}`;
const resolveInputStartsWith = input => `${escapeLikeWildcards(input)}%`;
const resolveInputEndsWith = input => `%${escapeLikeWildcards(input)}`;
function resolveInputCodecInsensitiveOperator(inputCodec) {
  return resolveDomains(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
}
function resolveSqlIdentifierInsensitiveOperator(sourceAlias, codec) {
  return resolveDomains(codec) === TYPES.citext ? [sourceAlias, codec] : [sql`lower(${sourceAlias}::text)`, TYPES.text];
}
function resolveSqlValueInsensitiveOperator(_unused, input, inputCodec) {
  const sqlValue = sqlValueWithCodec(input, inputCodec);
  if (inputCodec === TYPES.citext) return sqlValue;else return sql`lower(${sqlValue})`;
}
function resolveInputCodecInsensitiveOperator_list(inputCodec) {
  const t = resolveDomains(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
  return listOfCodec(t, {
    extensions: {
      listItemNonNull: !0
    }
  });
}
function resolveSqlValueInsensitiveOperator_list(_unused, input, inputCodec) {
  const sqlList = sqlValueWithCodec(input, inputCodec);
  if (inputCodec.arrayOfCodec === TYPES.citext) return sqlList;else return sql`(select lower(t) from unnest(${sqlList}) t)`;
}
function RepositoryToManyRepositoryCollaboratorFilter_everyApply($where, value) {
  assertAllowed(value, "object");
  if (value == null) return;
  if (!$where.extensions.pgFilterRelation) throw Error("Invalid use of filter, 'pgFilterRelation' expected");
  const {
      localAttributes,
      remoteAttributes,
      tableExpression,
      alias
    } = $where.extensions.pgFilterRelation,
    $subQuery = $where.notPlan().existsPlan({
      tableExpression,
      alias
    });
  localAttributes.forEach((localAttribute, i) => {
    const remoteAttribute = remoteAttributes[i];
    $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
  });
  return $subQuery.notPlan().andPlan();
}
function RepositoryToManyRepositoryCollaboratorFilter_someApply($where, value) {
  assertAllowed(value, "object");
  if (value == null) return;
  if (!$where.extensions.pgFilterRelation) throw Error("Invalid use of filter, 'pgFilterRelation' expected");
  const {
      localAttributes,
      remoteAttributes,
      tableExpression,
      alias
    } = $where.extensions.pgFilterRelation,
    $subQuery = $where.existsPlan({
      tableExpression,
      alias
    });
  localAttributes.forEach((localAttribute, i) => {
    const remoteAttribute = remoteAttributes[i];
    $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
  });
  $subQuery.ignoreUnlessAmended();
  return $subQuery;
}
function RepositoryToManyRepositoryCollaboratorFilter_noneApply($where, value) {
  assertAllowed(value, "object");
  if (value == null) return;
  if (!$where.extensions.pgFilterRelation) throw Error("Invalid use of filter, 'pgFilterRelation' expected");
  const {
      localAttributes,
      remoteAttributes,
      tableExpression,
      alias
    } = $where.extensions.pgFilterRelation,
    $subQuery = $where.notPlan().existsPlan({
      tableExpression,
      alias
    });
  localAttributes.forEach((localAttribute, i) => {
    const remoteAttribute = remoteAttributes[i];
    $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
  });
  $subQuery.ignoreUnlessAmended();
  return $subQuery;
}
class PgAggregateConditionExpression extends Modifier {
  spec;
  pgWhereConditionSpecListToSQL;
  alias;
  conditions = [];
  constructor(parent, spec, pgWhereConditionSpecListToSQL) {
    super(parent);
    this.spec = spec;
    this.pgWhereConditionSpecListToSQL = pgWhereConditionSpecListToSQL;
    this.alias = parent.alias;
  }
  where(condition) {
    this.conditions.push(condition);
  }
  apply() {
    const sqlCondition = this.pgWhereConditionSpecListToSQL(this.alias, this.conditions);
    if (sqlCondition) this.parent.expression(sqlCondition);
  }
}
class PgAggregateCondition extends Modifier {
  pgWhereConditionSpecListToSQL;
  sql;
  tableExpression;
  alias;
  conditions = [];
  expressions = [];
  constructor(parent, options, pgWhereConditionSpecListToSQL) {
    super(parent);
    this.pgWhereConditionSpecListToSQL = pgWhereConditionSpecListToSQL;
    const {
      sql,
      tableExpression,
      alias
    } = options;
    this.sql = sql;
    this.alias = sql.identifier(Symbol(alias ?? "aggregate"));
    this.tableExpression = tableExpression;
  }
  where(condition) {
    this.conditions.push(condition);
  }
  expression(expression) {
    this.expressions.push(expression);
  }
  forAggregate(spec) {
    return new PgAggregateConditionExpression(this, spec, this.pgWhereConditionSpecListToSQL);
  }
  apply() {
    const {
        sql
      } = this,
      sqlCondition = this.pgWhereConditionSpecListToSQL(this.alias, this.conditions),
      where = sqlCondition ? sql`where ${sqlCondition}` : sql.blank,
      boolExpr = this.expressions.length === 0 ? sql.true : sql.parens(sql.join(this.expressions.map(expr => sql.parens(expr)), `
and
`)),
      subquery = sql`(${sql.indent`\
select ${boolExpr}
from ${this.tableExpression} as ${this.alias}
${where}`}
group by ())`;
    return this.parent.where(subquery);
  }
}
const pgAggregatesApply = ($where, input) => {
  if (input == null) return;
  if (!$where.extensions.pgFilterRelation) throw Error("Invalid use of filter, 'pgFilterRelation' expected");
  const {
      localAttributes,
      remoteAttributes,
      tableExpression,
      alias
    } = $where.extensions.pgFilterRelation,
    $subQuery = new PgAggregateCondition($where, {
      sql,
      tableExpression,
      alias
    }, pgWhereConditionSpecListToSQL);
  localAttributes.forEach((localAttribute, i) => {
    const remoteAttribute = remoteAttributes[i];
    $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
  });
  return $subQuery;
};
function RepositoryToManyRepositoryCollaboratorFilter_aggregatesApply($where, input) {
  return pgAggregatesApply($where, input);
}
function pgAggregateApplyForeignCondition($subquery, input) {
  if (input == null) return;
  return new PgCondition($subquery, !1, "AND");
}
const filterApply = ($subquery, input) => pgAggregateApplyForeignCondition($subquery, input);
const dataTypeToAggregateTypeMap = {};
const pgAggregateSpec_distinctCount = {
  id: "distinctCount",
  humanLabel: "distinct count",
  HumanLabel: "Distinct count",
  isSuitableType() {
    return !0;
  },
  sqlAggregateWrap(sqlFrag) {
    return sql`count(distinct ${sqlFrag})`;
  },
  pgTypeCodecModifier(codec) {
    const oid = codec.extensions?.oid;
    return (oid ? dataTypeToAggregateTypeMap[oid] : null) ?? TYPES.bigint;
  }
};
function RepositoryAggregatesFilter_distinctCountApply($subquery, input) {
  if (input == null) return;
  return $subquery.forAggregate(pgAggregateSpec_distinctCount);
}
const pgAggregateApplyAttributeOrder = (spec, attributeName, attrCodec, rawAttrCodec, $parent, input) => {
  if (input == null) return;
  const $col = new PgCondition($parent);
  $col.extensions.pgFilterAttribute = {
    codec: attrCodec,
    expression: spec.sqlAggregateWrap(sql`${$col.alias}.${sql.identifier(attributeName)}`, rawAttrCodec)
  };
  return $col;
};
function RepositoryDistinctCountAggregateFilter_rowIdApply($parent, input) {
  return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "id", TYPES.bigint, TYPES.uuid, $parent, input);
}
function RepositoryDistinctCountAggregateFilter_organizationIdApply($parent, input) {
  return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "organization_id", TYPES.bigint, TYPES.uuid, $parent, input);
}
function RepositoryDistinctCountAggregateFilter_nameApply($parent, input) {
  return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "name", TYPES.bigint, TYPES.text, $parent, input);
}
function RepositoryDistinctCountAggregateFilter_descriptionApply($parent, input) {
  return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "description", TYPES.bigint, TYPES.text, $parent, input);
}
function RepositoryDistinctCountAggregateFilter_createdAtApply($parent, input) {
  return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "created_at", TYPES.bigint, TYPES.timestamptz, $parent, input);
}
function RepositoryDistinctCountAggregateFilter_updatedAtApply($parent, input) {
  return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "updated_at", TYPES.bigint, TYPES.timestamptz, $parent, input);
}
function RepositoryCollaboratorDistinctCountAggregateFilter_repositoryIdApply($parent, input) {
  return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "repository_id", TYPES.bigint, TYPES.uuid, $parent, input);
}
const isIntervalLike = codec => !!codec.extensions?.isIntervalLike;
const isNumberLike = codec => !!codec.extensions?.isNumberLike;
const pgAggregateSpec_sum_isSuitableType = codec => isIntervalLike(codec) || isNumberLike(codec);
const dataTypeToAggregateTypeMap2 = {
  "20": TYPES.numeric,
  "21": TYPES.bigint,
  "23": TYPES.bigint,
  "700": TYPES.float4,
  "701": TYPES.float,
  "790": TYPES.money,
  "1186": TYPES.interval
};
const pgAggregateSpec_sum = {
  id: "sum",
  humanLabel: "sum",
  HumanLabel: "Sum",
  isSuitableType: pgAggregateSpec_sum_isSuitableType,
  sqlAggregateWrap(sqlFrag) {
    return sql`coalesce(sum(${sqlFrag}), '0')`;
  },
  isNonNull: true,
  pgTypeCodecModifier(codec) {
    const oid = codec.extensions?.oid;
    return (oid ? dataTypeToAggregateTypeMap2[oid] : null) ?? TYPES.numeric;
  }
};
function PullRequestCommentAggregatesFilter_sumApply($subquery, input) {
  if (input == null) return;
  return $subquery.forAggregate(pgAggregateSpec_sum);
}
const pgAggregateSpec_min = {
  id: "min",
  humanLabel: "minimum",
  HumanLabel: "Minimum",
  isSuitableType: pgAggregateSpec_sum_isSuitableType,
  sqlAggregateWrap(sqlFrag) {
    return sql`min(${sqlFrag})`;
  }
};
function PullRequestCommentAggregatesFilter_minApply($subquery, input) {
  if (input == null) return;
  return $subquery.forAggregate(pgAggregateSpec_min);
}
const pgAggregateSpec_max = {
  id: "max",
  humanLabel: "maximum",
  HumanLabel: "Maximum",
  isSuitableType: pgAggregateSpec_sum_isSuitableType,
  sqlAggregateWrap(sqlFrag) {
    return sql`max(${sqlFrag})`;
  }
};
function PullRequestCommentAggregatesFilter_maxApply($subquery, input) {
  if (input == null) return;
  return $subquery.forAggregate(pgAggregateSpec_max);
}
const dataTypeToAggregateTypeMap3 = {
  "20": TYPES.numeric,
  "21": TYPES.numeric,
  "23": TYPES.numeric,
  "700": TYPES.float,
  "701": TYPES.float,
  "1186": TYPES.interval,
  "1700": TYPES.numeric
};
const pgAggregateSpec_average = {
  id: "average",
  humanLabel: "mean average",
  HumanLabel: "Mean average",
  isSuitableType: pgAggregateSpec_sum_isSuitableType,
  sqlAggregateWrap(sqlFrag) {
    return sql`avg(${sqlFrag})`;
  },
  pgTypeCodecModifier(codec) {
    const oid = codec.extensions?.oid;
    return (oid ? dataTypeToAggregateTypeMap3[oid] : null) ?? TYPES.numeric;
  }
};
function PullRequestCommentAggregatesFilter_averageApply($subquery, input) {
  if (input == null) return;
  return $subquery.forAggregate(pgAggregateSpec_average);
}
const dataTypeToAggregateTypeMap4 = {
  "700": TYPES.float,
  "701": TYPES.float
};
const pgAggregateSpec_stddevSample = {
  id: "stddevSample",
  humanLabel: "sample standard deviation",
  HumanLabel: "Sample standard deviation",
  isSuitableType: isNumberLike,
  sqlAggregateWrap(sqlFrag) {
    return sql`stddev_samp(${sqlFrag})`;
  },
  pgTypeCodecModifier(codec) {
    const oid = codec.extensions?.oid;
    return (oid ? dataTypeToAggregateTypeMap4[oid] : null) ?? TYPES.numeric;
  }
};
function PullRequestCommentAggregatesFilter_stddevSampleApply($subquery, input) {
  if (input == null) return;
  return $subquery.forAggregate(pgAggregateSpec_stddevSample);
}
const dataTypeToAggregateTypeMap5 = {
  "700": TYPES.float,
  "701": TYPES.float
};
const pgAggregateSpec_stddevPopulation = {
  id: "stddevPopulation",
  humanLabel: "population standard deviation",
  HumanLabel: "Population standard deviation",
  isSuitableType: isNumberLike,
  sqlAggregateWrap(sqlFrag) {
    return sql`stddev_pop(${sqlFrag})`;
  },
  pgTypeCodecModifier(codec) {
    const oid = codec.extensions?.oid;
    return (oid ? dataTypeToAggregateTypeMap5[oid] : null) ?? TYPES.numeric;
  }
};
function PullRequestCommentAggregatesFilter_stddevPopulationApply($subquery, input) {
  if (input == null) return;
  return $subquery.forAggregate(pgAggregateSpec_stddevPopulation);
}
const dataTypeToAggregateTypeMap6 = {
  "700": TYPES.float,
  "701": TYPES.float
};
const pgAggregateSpec_varianceSample = {
  id: "varianceSample",
  humanLabel: "sample variance",
  HumanLabel: "Sample variance",
  isSuitableType: isNumberLike,
  sqlAggregateWrap(sqlFrag) {
    return sql`var_samp(${sqlFrag})`;
  },
  pgTypeCodecModifier(codec) {
    const oid = codec.extensions?.oid;
    return (oid ? dataTypeToAggregateTypeMap6[oid] : null) ?? TYPES.numeric;
  }
};
function PullRequestCommentAggregatesFilter_varianceSampleApply($subquery, input) {
  if (input == null) return;
  return $subquery.forAggregate(pgAggregateSpec_varianceSample);
}
const dataTypeToAggregateTypeMap7 = {
  "700": TYPES.float,
  "701": TYPES.float
};
const pgAggregateSpec_variancePopulation = {
  id: "variancePopulation",
  humanLabel: "population variance",
  HumanLabel: "Population variance",
  isSuitableType: isNumberLike,
  sqlAggregateWrap(sqlFrag) {
    return sql`var_pop(${sqlFrag})`;
  },
  pgTypeCodecModifier(codec) {
    const oid = codec.extensions?.oid;
    return (oid ? dataTypeToAggregateTypeMap7[oid] : null) ?? TYPES.numeric;
  }
};
function PullRequestCommentAggregatesFilter_variancePopulationApply($subquery, input) {
  if (input == null) return;
  return $subquery.forAggregate(pgAggregateSpec_variancePopulation);
}
function PullRequestCommentDistinctCountAggregateFilter_pullRequestIdApply($parent, input) {
  return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "pull_request_id", TYPES.bigint, TYPES.uuid, $parent, input);
}
function PullRequestCommentDistinctCountAggregateFilter_authorIdApply($parent, input) {
  return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "author_id", TYPES.bigint, TYPES.uuid, $parent, input);
}
function PullRequestCommentDistinctCountAggregateFilter_bodyApply($parent, input) {
  return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "body", TYPES.bigint, TYPES.text, $parent, input);
}
function PullRequestReviewDistinctCountAggregateFilter_stateApply($parent, input) {
  return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "state", TYPES.bigint, TYPES.text, $parent, input);
}
function ExternalDependencyDistinctCountAggregateFilter_versionConstraintApply($parent, input) {
  return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "version_constraint", TYPES.bigint, TYPES.text, $parent, input);
}
function ExternalDependencyDistinctCountAggregateFilter_detectionSourceApply($parent, input) {
  return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "detection_source", TYPES.bigint, TYPES.text, $parent, input);
}
const RepositoryOrderBy_ROW_ID_ASCApply = queryBuilder => {
  queryBuilder.orderBy({
    attribute: "id",
    direction: "ASC"
  });
  queryBuilder.setOrderIsUnique();
};
const RepositoryOrderBy_ROW_ID_DESCApply = queryBuilder => {
  queryBuilder.orderBy({
    attribute: "id",
    direction: "DESC"
  });
  queryBuilder.setOrderIsUnique();
};
const RepositoryOrderBy_ORGANIZATION_ID_ASCApply = queryBuilder => {
  queryBuilder.orderBy({
    attribute: "organization_id",
    direction: "ASC"
  });
};
const RepositoryOrderBy_ORGANIZATION_ID_DESCApply = queryBuilder => {
  queryBuilder.orderBy({
    attribute: "organization_id",
    direction: "DESC"
  });
};
const RepositoryOrderBy_NAME_ASCApply = queryBuilder => {
  queryBuilder.orderBy({
    attribute: "name",
    direction: "ASC"
  });
};
const RepositoryOrderBy_NAME_DESCApply = queryBuilder => {
  queryBuilder.orderBy({
    attribute: "name",
    direction: "DESC"
  });
};
const RepositoryOrderBy_DESCRIPTION_ASCApply = queryBuilder => {
  queryBuilder.orderBy({
    attribute: "description",
    direction: "ASC"
  });
};
const RepositoryOrderBy_DESCRIPTION_DESCApply = queryBuilder => {
  queryBuilder.orderBy({
    attribute: "description",
    direction: "DESC"
  });
};
const RepositoryOrderBy_CREATED_AT_ASCApply = queryBuilder => {
  queryBuilder.orderBy({
    attribute: "created_at",
    direction: "ASC"
  });
};
const RepositoryOrderBy_CREATED_AT_DESCApply = queryBuilder => {
  queryBuilder.orderBy({
    attribute: "created_at",
    direction: "DESC"
  });
};
const RepositoryOrderBy_UPDATED_AT_ASCApply = queryBuilder => {
  queryBuilder.orderBy({
    attribute: "updated_at",
    direction: "ASC"
  });
};
const RepositoryOrderBy_UPDATED_AT_DESCApply = queryBuilder => {
  queryBuilder.orderBy({
    attribute: "updated_at",
    direction: "DESC"
  });
};
const pgAggregatesApplyOrderByTotalCount = (direction, relation, table, $select) => {
  const foreignTableAlias = $select.alias,
    conditions = [],
    tableAlias = sql.identifier(Symbol(table.name));
  relation.localAttributes.forEach((localAttribute, i) => {
    const remoteAttribute = relation.remoteAttributes[i];
    conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
  });
  if (typeof table.from === "function") throw Error("Function source unsupported");
  const fragment = sql`(${sql.indent`select count(*)
from ${table.from} ${tableAlias}
where ${sql.parens(sql.join(conditions.map(c => sql.parens(c)), " AND "))}`})`;
  $select.orderBy({
    fragment,
    codec: TYPES.bigint,
    direction
  });
};
const relation = registry.pgRelations["repository"]["repositoryCollaboratorsByTheirRepositoryId"];
const pgAggregatesApplyOrderByAttribute = (aggregateSpec, attribute, attributeName, direction, relation, table, $select) => {
  const foreignTableAlias = $select.alias,
    conditions = [],
    tableAlias = sql.identifier(Symbol(table.name));
  relation.localAttributes.forEach((localAttribute, i) => {
    const remoteAttribute = relation.remoteAttributes[i];
    conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
  });
  if (typeof table.from === "function") throw Error("Function source unsupported");
  const fragment = sql`(${sql.indent`
select ${aggregateSpec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier(attributeName)}`, attribute.codec)}
from ${table.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
  $select.orderBy({
    fragment,
    codec: aggregateSpec.pgTypeCodecModifier?.(attribute.codec) ?? attribute.codec,
    direction
  });
};
const relation2 = registry.pgRelations["repository"]["externalDependenciesByTheirRepositoryId"];
const relation3 = registry.pgRelations["repository"]["repositoryRelationshipsByTheirSourceRepositoryId"];
const relation4 = registry.pgRelations["repository"]["repositoryRelationshipsByTheirTargetRepositoryId"];
const relation5 = registry.pgRelations["repository"]["pullRequestsByTheirRepositoryId"];
const RepositoryCollaborator_repositoryIdPlan = $record => {
  return $record.get("repository_id");
};
const RepositoryCollaborator_repositoryPlan = $record => spec_resource_repositoryPgResource.get({
  id: $record.get("repository_id")
});
const pgAggregatesPlanKeys = $pgSelectSingle => {
  const $groupDetails = $pgSelectSingle.getClassStep().getGroupDetails();
  return lambda([$groupDetails, $pgSelectSingle], ([groupDetails, item]) => {
    if (groupDetails.indicies.length === 0 || item == null) return null;else return groupDetails.indicies.map(({
      index
    }) => item[index]);
  });
};
function RepositoryCollaboratorAggregates_keysPlan($pgSelectSingle) {
  return pgAggregatesPlanKeys($pgSelectSingle);
}
function pgAggregatesPlanAggregates($pgSelectSingle) {
  return $pgSelectSingle;
}
const pgAggregatesPlanAggregateAttribute = (attributeCodec, attributeName, codec, spec, $pgSelectSingle) => {
  const sqlAttribute = sql.fragment`${$pgSelectSingle.getClassStep().alias}.${sql.identifier(attributeName)}`,
    sqlAggregate = spec.sqlAggregateWrap(sqlAttribute, attributeCodec);
  return $pgSelectSingle.select(sqlAggregate, codec);
};
function RepositoryCollaboratorDistinctCountAggregates_repositoryIdPlan($pgSelectSingle) {
  return pgAggregatesPlanAggregateAttribute(TYPES.uuid, "repository_id", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
}
function RepositoryCollaboratorDistinctCountAggregates_createdAtPlan($pgSelectSingle) {
  return pgAggregatesPlanAggregateAttribute(TYPES.timestamptz, "created_at", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
}
function RepositoryCollaboratorDistinctCountAggregates_updatedAtPlan($pgSelectSingle) {
  return pgAggregatesPlanAggregateAttribute(TYPES.timestamptz, "updated_at", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
}
const applyGroupByAttribute = (attributeName, attrCodec, qb) => {
  qb.groupBy({
    fragment: sql.fragment`${qb.alias}.${sql.identifier(attributeName)}`,
    codec: attrCodec
  });
};
function RepositoryCollaboratorGroupBy_REPOSITORY_IDApply($pgSelect) {
  applyGroupByAttribute("repository_id", TYPES.uuid, $pgSelect);
}
function RepositoryCollaboratorGroupBy_CREATED_ATApply($pgSelect) {
  applyGroupByAttribute("created_at", TYPES.timestamptz, $pgSelect);
}
const pgAggregateGroupBySpec_truncated_to_hour_isSuitableType = codec => codec === TYPES.timestamp || codec === TYPES.timestamptz;
const pgAggregateGroupBySpec_truncated_to_hour = {
  id: "truncated-to-hour",
  isSuitableType: pgAggregateGroupBySpec_truncated_to_hour_isSuitableType,
  sqlWrap(sqlFrag) {
    return sql`date_trunc('hour', ${sqlFrag})`;
  },
  sqlWrapCodec(codec) {
    return codec;
  }
};
const applyGroupByAggregateSpec = (aggregateGroupBySpec, attributeName, attrCodec, qb) => {
  qb.groupBy({
    fragment: aggregateGroupBySpec.sqlWrap(sql`${qb.alias}.${sql.identifier(attributeName)}`),
    codec: aggregateGroupBySpec.sqlWrapCodec(attrCodec)
  });
};
function RepositoryCollaboratorGroupBy_CREATED_AT_TRUNCATED_TO_HOURApply(qb) {
  applyGroupByAggregateSpec(pgAggregateGroupBySpec_truncated_to_hour, "created_at", TYPES.timestamptz, qb);
}
const pgAggregateGroupBySpec_truncated_to_day = {
  id: "truncated-to-day",
  isSuitableType: pgAggregateGroupBySpec_truncated_to_hour_isSuitableType,
  sqlWrap(sqlFrag) {
    return sql`date_trunc('day', ${sqlFrag})`;
  },
  sqlWrapCodec(codec) {
    return codec;
  }
};
function RepositoryCollaboratorGroupBy_CREATED_AT_TRUNCATED_TO_DAYApply(qb) {
  applyGroupByAggregateSpec(pgAggregateGroupBySpec_truncated_to_day, "created_at", TYPES.timestamptz, qb);
}
function RepositoryCollaboratorGroupBy_UPDATED_ATApply($pgSelect) {
  applyGroupByAttribute("updated_at", TYPES.timestamptz, $pgSelect);
}
function RepositoryCollaboratorGroupBy_UPDATED_AT_TRUNCATED_TO_HOURApply(qb) {
  applyGroupByAggregateSpec(pgAggregateGroupBySpec_truncated_to_hour, "updated_at", TYPES.timestamptz, qb);
}
function RepositoryCollaboratorGroupBy_UPDATED_AT_TRUNCATED_TO_DAYApply(qb) {
  applyGroupByAggregateSpec(pgAggregateGroupBySpec_truncated_to_day, "updated_at", TYPES.timestamptz, qb);
}
function pgAggregatesApplyAnd($where) {
  return $where;
}
const RepositoryCollaboratorHavingInput_ORApply = $where => new PgOrFilter($where);
function pgAggregatesPlanAggregatesField($having) {
  return $having;
}
const pgAggregatesApplyAttributeFilter = (aggregateSpec, attribute, attributeName, $having) => {
  const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier(attributeName)}`,
    aggregateExpression = aggregateSpec.sqlAggregateWrap(attributeExpression, attribute.codec);
  return new PgBooleanFilter($having, aggregateExpression);
};
const infix = () => sql.fragment`=`;
const pgAggregatesApplyHavingBinaryOperation = (codec, infix, $booleanFilter, input) => {
  if (input == null) return;
  $booleanFilter.having(sql`(${sql.parens($booleanFilter.expression)} ${infix()} ${sqlValueWithCodec(input, codec)})`);
};
const infix2 = () => sql.fragment`<>`;
const infix3 = () => sql.fragment`>`;
const infix4 = () => sql.fragment`>=`;
const infix5 = () => sql.fragment`<`;
const infix6 = () => sql.fragment`<=`;
const RepositoryCollaboratorCondition_repositoryIdApply = ($condition, val) => applyAttributeCondition("repository_id", TYPES.uuid, $condition, val);
const PullRequestComment_pullRequestIdPlan = $record => {
  return $record.get("pull_request_id");
};
const PullRequestComment_authorIdPlan = $record => {
  return $record.get("author_id");
};
const PullRequestComment_authorPlan = $record => spec_resource_userPgResource.get({
  id: $record.get("author_id")
});
const PullRequestComment_pullRequestPlan = $record => spec_resource_pull_requestPgResource.get({
  id: $record.get("pull_request_id")
});
const PullRequestCommentCondition_pullRequestIdApply = ($condition, val) => applyAttributeCondition("pull_request_id", TYPES.uuid, $condition, val);
const PullRequestCommentCondition_authorIdApply = ($condition, val) => applyAttributeCondition("author_id", TYPES.uuid, $condition, val);
const PullRequestCommentCondition_bodyApply = ($condition, val) => applyAttributeCondition("body", TYPES.text, $condition, val);
const PullRequestCommentOrderBy_PULL_REQUEST_ID_ASCApply = queryBuilder => {
  queryBuilder.orderBy({
    attribute: "pull_request_id",
    direction: "ASC"
  });
};
const PullRequestCommentOrderBy_PULL_REQUEST_ID_DESCApply = queryBuilder => {
  queryBuilder.orderBy({
    attribute: "pull_request_id",
    direction: "DESC"
  });
};
const PullRequestCommentOrderBy_AUTHOR_ID_ASCApply = queryBuilder => {
  queryBuilder.orderBy({
    attribute: "author_id",
    direction: "ASC"
  });
};
const PullRequestCommentOrderBy_AUTHOR_ID_DESCApply = queryBuilder => {
  queryBuilder.orderBy({
    attribute: "author_id",
    direction: "DESC"
  });
};
const PullRequestCommentOrderBy_BODY_ASCApply = queryBuilder => {
  queryBuilder.orderBy({
    attribute: "body",
    direction: "ASC"
  });
};
const PullRequestCommentOrderBy_BODY_DESCApply = queryBuilder => {
  queryBuilder.orderBy({
    attribute: "body",
    direction: "DESC"
  });
};
function PullRequestReviewDistinctCountAggregates_rowIdPlan($pgSelectSingle) {
  return pgAggregatesPlanAggregateAttribute(TYPES.uuid, "id", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
}
function PullRequestReviewDistinctCountAggregates_pullRequestIdPlan($pgSelectSingle) {
  return pgAggregatesPlanAggregateAttribute(TYPES.uuid, "pull_request_id", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
}
function PullRequestReviewDistinctCountAggregates_statePlan($pgSelectSingle) {
  return pgAggregatesPlanAggregateAttribute(TYPES.text, "state", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
}
function PullRequestReviewDistinctCountAggregates_bodyPlan($pgSelectSingle) {
  return pgAggregatesPlanAggregateAttribute(TYPES.text, "body", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
}
function PullRequestReviewGroupBy_PULL_REQUEST_IDApply($pgSelect) {
  applyGroupByAttribute("pull_request_id", TYPES.uuid, $pgSelect);
}
function PullRequestReviewGroupBy_STATEApply($pgSelect) {
  applyGroupByAttribute("state", TYPES.text, $pgSelect);
}
function PullRequestReviewGroupBy_BODYApply($pgSelect) {
  applyGroupByAttribute("body", TYPES.text, $pgSelect);
}
const PullRequestReviewCondition_stateApply = ($condition, val) => applyAttributeCondition("state", TYPES.text, $condition, val);
const PullRequestReviewOrderBy_STATE_ASCApply = queryBuilder => {
  queryBuilder.orderBy({
    attribute: "state",
    direction: "ASC"
  });
};
const PullRequestReviewOrderBy_STATE_DESCApply = queryBuilder => {
  queryBuilder.orderBy({
    attribute: "state",
    direction: "DESC"
  });
};
function PullRequestCommentDistinctCountAggregates_authorIdPlan($pgSelectSingle) {
  return pgAggregatesPlanAggregateAttribute(TYPES.uuid, "author_id", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
}
function PullRequestCommentGroupBy_AUTHOR_IDApply($pgSelect) {
  applyGroupByAttribute("author_id", TYPES.uuid, $pgSelect);
}
function PullRequestDistinctCountAggregates_descriptionPlan($pgSelectSingle) {
  return pgAggregatesPlanAggregateAttribute(TYPES.text, "description", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
}
function PullRequestGroupBy_DESCRIPTIONApply($pgSelect) {
  applyGroupByAttribute("description", TYPES.text, $pgSelect);
}
const PullRequestOrderBy_REPOSITORY_ID_ASCApply = queryBuilder => {
  queryBuilder.orderBy({
    attribute: "repository_id",
    direction: "ASC"
  });
};
const PullRequestOrderBy_REPOSITORY_ID_DESCApply = queryBuilder => {
  queryBuilder.orderBy({
    attribute: "repository_id",
    direction: "DESC"
  });
};
const relation6 = registry.pgRelations["pullRequest"]["pullRequestCommentsByTheirPullRequestId"];
const relation7 = registry.pgRelations["pullRequest"]["pullRequestReviewsByTheirPullRequestId"];
function ExternalDependencyDistinctCountAggregates_versionConstraintPlan($pgSelectSingle) {
  return pgAggregatesPlanAggregateAttribute(TYPES.text, "version_constraint", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
}
function ExternalDependencyDistinctCountAggregates_detectionSourcePlan($pgSelectSingle) {
  return pgAggregatesPlanAggregateAttribute(TYPES.text, "detection_source", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
}
function ExternalDependencyGroupBy_VERSION_CONSTRAINTApply($pgSelect) {
  applyGroupByAttribute("version_constraint", TYPES.text, $pgSelect);
}
function ExternalDependencyGroupBy_DETECTION_SOURCEApply($pgSelect) {
  applyGroupByAttribute("detection_source", TYPES.text, $pgSelect);
}
const ExternalDependencyCondition_versionConstraintApply = ($condition, val) => applyAttributeCondition("version_constraint", TYPES.text, $condition, val);
const ExternalDependencyCondition_detectionSourceApply = ($condition, val) => applyAttributeCondition("detection_source", TYPES.text, $condition, val);
const ExternalDependencyOrderBy_VERSION_CONSTRAINT_ASCApply = queryBuilder => {
  queryBuilder.orderBy({
    attribute: "version_constraint",
    direction: "ASC"
  });
};
const ExternalDependencyOrderBy_VERSION_CONSTRAINT_DESCApply = queryBuilder => {
  queryBuilder.orderBy({
    attribute: "version_constraint",
    direction: "DESC"
  });
};
const ExternalDependencyOrderBy_DETECTION_SOURCE_ASCApply = queryBuilder => {
  queryBuilder.orderBy({
    attribute: "detection_source",
    direction: "ASC"
  });
};
const ExternalDependencyOrderBy_DETECTION_SOURCE_DESCApply = queryBuilder => {
  queryBuilder.orderBy({
    attribute: "detection_source",
    direction: "DESC"
  });
};
const relation8 = registry.pgRelations["repositoryRelationship"]["repositoryRelationshipMetadataByTheirRelationshipId"];
function RepositoryDistinctCountAggregates_organizationIdPlan($pgSelectSingle) {
  return pgAggregatesPlanAggregateAttribute(TYPES.uuid, "organization_id", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
}
function RepositoryDistinctCountAggregates_namePlan($pgSelectSingle) {
  return pgAggregatesPlanAggregateAttribute(TYPES.text, "name", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
}
function RepositoryGroupBy_ORGANIZATION_IDApply($pgSelect) {
  applyGroupByAttribute("organization_id", TYPES.uuid, $pgSelect);
}
function RepositoryGroupBy_NAMEApply($pgSelect) {
  applyGroupByAttribute("name", TYPES.text, $pgSelect);
}
const relation9 = registry.pgRelations["repositoryRelationshipType"]["repositoryRelationshipsByTheirRelationshipTypeId"];
function UserDistinctCountAggregates_avatarUrlPlan($pgSelectSingle) {
  return pgAggregatesPlanAggregateAttribute(TYPES.text, "avatar_url", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
}
function UserGroupBy_AVATAR_URLApply($pgSelect) {
  applyGroupByAttribute("avatar_url", TYPES.text, $pgSelect);
}
const UserCondition_avatarUrlApply = ($condition, val) => applyAttributeCondition("avatar_url", TYPES.text, $condition, val);
const UserOrderBy_AVATAR_URL_ASCApply = queryBuilder => {
  queryBuilder.orderBy({
    attribute: "avatar_url",
    direction: "ASC"
  });
};
const UserOrderBy_AVATAR_URL_DESCApply = queryBuilder => {
  queryBuilder.orderBy({
    attribute: "avatar_url",
    direction: "DESC"
  });
};
const relation10 = registry.pgRelations["user"]["repositoriesByTheirOwnerId"];
const relation11 = registry.pgRelations["user"]["repositoryCollaboratorsByTheirUserId"];
const relation12 = registry.pgRelations["user"]["pullRequestCommentsByTheirAuthorId"];
const relation13 = registry.pgRelations["user"]["pullRequestReviewsByTheirReviewerId"];
const relation14 = registry.pgRelations["user"]["pullRequestsByTheirAuthorId"];
const relation15 = registry.pgRelations["user"]["pullRequestsByTheirMergedById"];
const relation16 = registry.pgRelations["organization"]["repositoriesByTheirOrganizationId"];
const relation17 = registry.pgRelations["organization"]["repositoryRelationshipTypesByTheirOrganizationId"];
function getClientMutationIdForCreatePlan($mutation) {
  return $mutation.getStepForKey("result").getMeta("clientMutationId");
}
function planCreatePayloadResult($object) {
  return $object.get("result");
}
function queryPlan() {
  return rootValue();
}
const getPgSelectSingleFromMutationResult = (resource, pkAttributes, $mutation) => {
  const $result = $mutation.getStepForKey("result", !0);
  if (!$result) return null;
  if ($result instanceof PgDeleteSingleStep) return pgSelectFromRecord($result.resource, $result.record());else {
    const spec = pkAttributes.reduce((memo, attributeName) => {
      memo[attributeName] = $result.get(attributeName);
      return memo;
    }, Object.create(null));
    return resource.find(spec);
  }
};
const pgMutationPayloadEdge = (resource, pkAttributes, $mutation, fieldArgs) => {
  const $select = getPgSelectSingleFromMutationResult(resource, pkAttributes, $mutation);
  if (!$select) return constant(null);
  fieldArgs.apply($select, "orderBy");
  const $connection = connection($select);
  return new EdgeStep($connection, first($connection));
};
const CreateRepositoryRelationshipMetadatumPayload_repositoryRelationshipMetadatumEdgePlan = ($mutation, fieldArgs) => pgMutationPayloadEdge(spec_resource_repository_relationship_metadataPgResource, repository_relationship_metadataUniques[0].attributes, $mutation, fieldArgs);
function applyClientMutationIdForCreate(qb, val) {
  qb.setMeta("clientMutationId", val);
}
function applyCreateFields(qb, arg) {
  if (arg != null) return qb.setBuilder();
}
function RepositoryRelationshipMetadatumInput_rowIdApply(obj, val, info) {
  obj.set("id", bakedInputRuntime(info.schema, info.field.type, val));
}
function RepositoryRelationshipMetadatumInput_relationshipIdApply(obj, val, info) {
  obj.set("relationship_id", bakedInputRuntime(info.schema, info.field.type, val));
}
function RepositoryRelationshipMetadatumInput_keyApply(obj, val, info) {
  obj.set("key", bakedInputRuntime(info.schema, info.field.type, val));
}
function RepositoryRelationshipMetadatumInput_valueApply(obj, val, info) {
  obj.set("value", bakedInputRuntime(info.schema, info.field.type, val));
}
function RepositoryRelationshipMetadatumInput_createdAtApply(obj, val, info) {
  obj.set("created_at", bakedInputRuntime(info.schema, info.field.type, val));
}
const CreateExternalDependencyPayload_externalDependencyEdgePlan = ($mutation, fieldArgs) => pgMutationPayloadEdge(spec_resource_external_dependencyPgResource, external_dependencyUniques[0].attributes, $mutation, fieldArgs);
function ExternalDependencyInput_repositoryIdApply(obj, val, info) {
  obj.set("repository_id", bakedInputRuntime(info.schema, info.field.type, val));
}
function ExternalDependencyInput_packageManagerApply(obj, val, info) {
  obj.set("package_manager", bakedInputRuntime(info.schema, info.field.type, val));
}
function ExternalDependencyInput_packageNameApply(obj, val, info) {
  obj.set("package_name", bakedInputRuntime(info.schema, info.field.type, val));
}
function ExternalDependencyInput_versionConstraintApply(obj, val, info) {
  obj.set("version_constraint", bakedInputRuntime(info.schema, info.field.type, val));
}
function ExternalDependencyInput_detectionSourceApply(obj, val, info) {
  obj.set("detection_source", bakedInputRuntime(info.schema, info.field.type, val));
}
const CreateRepositoryCollaboratorPayload_repositoryCollaboratorEdgePlan = ($mutation, fieldArgs) => pgMutationPayloadEdge(spec_resource_repository_collaboratorPgResource, repository_collaboratorUniques[0].attributes, $mutation, fieldArgs);
function RepositoryCollaboratorInput_userIdApply(obj, val, info) {
  obj.set("user_id", bakedInputRuntime(info.schema, info.field.type, val));
}
function RepositoryCollaboratorInput_permissionApply(obj, val, info) {
  obj.set("permission", bakedInputRuntime(info.schema, info.field.type, val));
}
function RepositoryCollaboratorInput_updatedAtApply(obj, val, info) {
  obj.set("updated_at", bakedInputRuntime(info.schema, info.field.type, val));
}
const CreateRepositoryRelationshipTypePayload_repositoryRelationshipTypeEdgePlan = ($mutation, fieldArgs) => pgMutationPayloadEdge(spec_resource_repository_relationship_typePgResource, repository_relationship_typeUniques[0].attributes, $mutation, fieldArgs);
function RepositoryRelationshipTypeInput_nameApply(obj, val, info) {
  obj.set("name", bakedInputRuntime(info.schema, info.field.type, val));
}
function RepositoryRelationshipTypeInput_descriptionApply(obj, val, info) {
  obj.set("description", bakedInputRuntime(info.schema, info.field.type, val));
}
function RepositoryRelationshipTypeInput_isDirectedApply(obj, val, info) {
  obj.set("is_directed", bakedInputRuntime(info.schema, info.field.type, val));
}
function RepositoryRelationshipTypeInput_organizationIdApply(obj, val, info) {
  obj.set("organization_id", bakedInputRuntime(info.schema, info.field.type, val));
}
const CreatePullRequestReviewPayload_pullRequestReviewEdgePlan = ($mutation, fieldArgs) => pgMutationPayloadEdge(spec_resource_pull_request_reviewPgResource, pull_request_reviewUniques[0].attributes, $mutation, fieldArgs);
function PullRequestReviewInput_pullRequestIdApply(obj, val, info) {
  obj.set("pull_request_id", bakedInputRuntime(info.schema, info.field.type, val));
}
function PullRequestReviewInput_reviewerIdApply(obj, val, info) {
  obj.set("reviewer_id", bakedInputRuntime(info.schema, info.field.type, val));
}
function PullRequestReviewInput_stateApply(obj, val, info) {
  obj.set("state", bakedInputRuntime(info.schema, info.field.type, val));
}
function PullRequestReviewInput_bodyApply(obj, val, info) {
  obj.set("body", bakedInputRuntime(info.schema, info.field.type, val));
}
function PullRequestReviewInput_submittedAtApply(obj, val, info) {
  obj.set("submitted_at", bakedInputRuntime(info.schema, info.field.type, val));
}
const CreateUserPayload_userEdgePlan = ($mutation, fieldArgs) => pgMutationPayloadEdge(spec_resource_userPgResource, userUniques[0].attributes, $mutation, fieldArgs);
function UserInput_identityProviderIdApply(obj, val, info) {
  obj.set("identity_provider_id", bakedInputRuntime(info.schema, info.field.type, val));
}
function UserInput_avatarUrlApply(obj, val, info) {
  obj.set("avatar_url", bakedInputRuntime(info.schema, info.field.type, val));
}
function UserInput_emailApply(obj, val, info) {
  obj.set("email", bakedInputRuntime(info.schema, info.field.type, val));
}
function UserInput_usernameApply(obj, val, info) {
  obj.set("username", bakedInputRuntime(info.schema, info.field.type, val));
}
function UserInput_bioApply(obj, val, info) {
  obj.set("bio", bakedInputRuntime(info.schema, info.field.type, val));
}
const CreatePullRequestCommentPayload_pullRequestCommentEdgePlan = ($mutation, fieldArgs) => pgMutationPayloadEdge(spec_resource_pull_request_commentPgResource, pull_request_commentUniques[0].attributes, $mutation, fieldArgs);
function PullRequestCommentInput_authorIdApply(obj, val, info) {
  obj.set("author_id", bakedInputRuntime(info.schema, info.field.type, val));
}
function PullRequestCommentInput_pathApply(obj, val, info) {
  obj.set("path", bakedInputRuntime(info.schema, info.field.type, val));
}
function PullRequestCommentInput_lineApply(obj, val, info) {
  obj.set("line", bakedInputRuntime(info.schema, info.field.type, val));
}
function PullRequestCommentInput_sideApply(obj, val, info) {
  obj.set("side", bakedInputRuntime(info.schema, info.field.type, val));
}
function PullRequestCommentInput_commitShaApply(obj, val, info) {
  obj.set("commit_sha", bakedInputRuntime(info.schema, info.field.type, val));
}
function PullRequestCommentInput_replyToIdApply(obj, val, info) {
  obj.set("reply_to_id", bakedInputRuntime(info.schema, info.field.type, val));
}
const CreateRepositoryRelationshipPayload_repositoryRelationshipEdgePlan = ($mutation, fieldArgs) => pgMutationPayloadEdge(spec_resource_repository_relationshipPgResource, repository_relationshipUniques[0].attributes, $mutation, fieldArgs);
function RepositoryRelationshipInput_sourceRepositoryIdApply(obj, val, info) {
  obj.set("source_repository_id", bakedInputRuntime(info.schema, info.field.type, val));
}
function RepositoryRelationshipInput_targetRepositoryIdApply(obj, val, info) {
  obj.set("target_repository_id", bakedInputRuntime(info.schema, info.field.type, val));
}
function RepositoryRelationshipInput_relationshipTypeIdApply(obj, val, info) {
  obj.set("relationship_type_id", bakedInputRuntime(info.schema, info.field.type, val));
}
function RepositoryRelationshipInput_confidenceApply(obj, val, info) {
  obj.set("confidence", bakedInputRuntime(info.schema, info.field.type, val));
}
function RepositoryRelationshipInput_branchApply(obj, val, info) {
  obj.set("branch", bakedInputRuntime(info.schema, info.field.type, val));
}
const CreateOrganizationPayload_organizationEdgePlan = ($mutation, fieldArgs) => pgMutationPayloadEdge(spec_resource_organizationPgResource, organizationUniques[0].attributes, $mutation, fieldArgs);
function OrganizationInput_idpOrganizationIdApply(obj, val, info) {
  obj.set("idp_organization_id", bakedInputRuntime(info.schema, info.field.type, val));
}
function OrganizationInput_subscriptionIdApply(obj, val, info) {
  obj.set("subscription_id", bakedInputRuntime(info.schema, info.field.type, val));
}
function OrganizationInput_billingAccountIdApply(obj, val, info) {
  obj.set("billing_account_id", bakedInputRuntime(info.schema, info.field.type, val));
}
function OrganizationInput_deletedAtApply(obj, val, info) {
  obj.set("deleted_at", bakedInputRuntime(info.schema, info.field.type, val));
}
function OrganizationInput_deletionReasonApply(obj, val, info) {
  obj.set("deletion_reason", bakedInputRuntime(info.schema, info.field.type, val));
}
const CreateRepositoryPayload_repositoryEdgePlan = ($mutation, fieldArgs) => pgMutationPayloadEdge(spec_resource_repositoryPgResource, repositoryUniques[0].attributes, $mutation, fieldArgs);
function RepositoryInput_ownerIdApply(obj, val, info) {
  obj.set("owner_id", bakedInputRuntime(info.schema, info.field.type, val));
}
function RepositoryInput_slugApply(obj, val, info) {
  obj.set("slug", bakedInputRuntime(info.schema, info.field.type, val));
}
function RepositoryInput_visibilityApply(obj, val, info) {
  obj.set("visibility", bakedInputRuntime(info.schema, info.field.type, val));
}
function RepositoryInput_defaultBranchApply(obj, val, info) {
  obj.set("default_branch", bakedInputRuntime(info.schema, info.field.type, val));
}
const CreatePullRequestPayload_pullRequestEdgePlan = ($mutation, fieldArgs) => pgMutationPayloadEdge(spec_resource_pull_requestPgResource, pull_requestUniques[0].attributes, $mutation, fieldArgs);
function PullRequestInput_numberApply(obj, val, info) {
  obj.set("number", bakedInputRuntime(info.schema, info.field.type, val));
}
function PullRequestInput_titleApply(obj, val, info) {
  obj.set("title", bakedInputRuntime(info.schema, info.field.type, val));
}
function PullRequestInput_sourceBranchApply(obj, val, info) {
  obj.set("source_branch", bakedInputRuntime(info.schema, info.field.type, val));
}
function PullRequestInput_targetBranchApply(obj, val, info) {
  obj.set("target_branch", bakedInputRuntime(info.schema, info.field.type, val));
}
function PullRequestInput_mergeCommitShaApply(obj, val, info) {
  obj.set("merge_commit_sha", bakedInputRuntime(info.schema, info.field.type, val));
}
function PullRequestInput_mergedAtApply(obj, val, info) {
  obj.set("merged_at", bakedInputRuntime(info.schema, info.field.type, val));
}
function PullRequestInput_mergedByIdApply(obj, val, info) {
  obj.set("merged_by_id", bakedInputRuntime(info.schema, info.field.type, val));
}
function PullRequestInput_closedAtApply(obj, val, info) {
  obj.set("closed_at", bakedInputRuntime(info.schema, info.field.type, val));
}
const InitializeRepositoryPayload_success_plan = $payload => {
  return lambda($payload, p => p?.success ?? !1);
};
const InitializeRepositoryPayload_error_plan = $payload => {
  return lambda($payload, p => p?.error ?? null);
};
const specForHandlerCache = new Map();
function specForHandler(handler) {
  const existing = specForHandlerCache.get(handler);
  if (existing) return existing;
  const spec = markSyncAndSafe(function spec(nodeId) {
    if (nodeId == null) return null;
    try {
      const specifier = handler.codec.decode(nodeId);
      if (handler.match(specifier)) return specifier;
    } catch {}
    return null;
  }, `specifier_${handler.typeName}_${handler.codec.name}`);
  specForHandlerCache.set(handler, spec);
  return spec;
}
const nodeFetcher_RepositoryRelationshipMetadatum = $nodeId => {
  const $decoded = lambda($nodeId, specForHandler(nodeIdHandler_RepositoryRelationshipMetadatum));
  return nodeIdHandler_RepositoryRelationshipMetadatum.get(nodeIdHandler_RepositoryRelationshipMetadatum.getSpec($decoded));
};
const nodeFetcher_ExternalDependency = $nodeId => {
  const $decoded = lambda($nodeId, specForHandler(nodeIdHandler_ExternalDependency));
  return nodeIdHandler_ExternalDependency.get(nodeIdHandler_ExternalDependency.getSpec($decoded));
};
const nodeFetcher_RepositoryCollaborator = $nodeId => {
  const $decoded = lambda($nodeId, specForHandler(nodeIdHandler_RepositoryCollaborator));
  return nodeIdHandler_RepositoryCollaborator.get(nodeIdHandler_RepositoryCollaborator.getSpec($decoded));
};
const nodeFetcher_RepositoryRelationshipType = $nodeId => {
  const $decoded = lambda($nodeId, specForHandler(nodeIdHandler_RepositoryRelationshipType));
  return nodeIdHandler_RepositoryRelationshipType.get(nodeIdHandler_RepositoryRelationshipType.getSpec($decoded));
};
const nodeFetcher_PullRequestReview = $nodeId => {
  const $decoded = lambda($nodeId, specForHandler(nodeIdHandler_PullRequestReview));
  return nodeIdHandler_PullRequestReview.get(nodeIdHandler_PullRequestReview.getSpec($decoded));
};
const nodeFetcher_User = $nodeId => {
  const $decoded = lambda($nodeId, specForHandler(nodeIdHandler_User));
  return nodeIdHandler_User.get(nodeIdHandler_User.getSpec($decoded));
};
const nodeFetcher_PullRequestComment = $nodeId => {
  const $decoded = lambda($nodeId, specForHandler(nodeIdHandler_PullRequestComment));
  return nodeIdHandler_PullRequestComment.get(nodeIdHandler_PullRequestComment.getSpec($decoded));
};
const nodeFetcher_RepositoryRelationship = $nodeId => {
  const $decoded = lambda($nodeId, specForHandler(nodeIdHandler_RepositoryRelationship));
  return nodeIdHandler_RepositoryRelationship.get(nodeIdHandler_RepositoryRelationship.getSpec($decoded));
};
const nodeFetcher_Organization = $nodeId => {
  const $decoded = lambda($nodeId, specForHandler(nodeIdHandler_Organization));
  return nodeIdHandler_Organization.get(nodeIdHandler_Organization.getSpec($decoded));
};
const nodeFetcher_Repository = $nodeId => {
  const $decoded = lambda($nodeId, specForHandler(nodeIdHandler_Repository));
  return nodeIdHandler_Repository.get(nodeIdHandler_Repository.getSpec($decoded));
};
const nodeFetcher_PullRequest = $nodeId => {
  const $decoded = lambda($nodeId, specForHandler(nodeIdHandler_PullRequest));
  return nodeIdHandler_PullRequest.get(nodeIdHandler_PullRequest.getSpec($decoded));
};
function applyInputToInsert(_, $object) {
  return $object;
}
function oldPlan(_, args) {
  const $insert = pgInsertSingle(spec_resource_repository_collaboratorPgResource);
  args.apply($insert);
  return object({
    result: $insert
  });
}
const planWrapper = (plan, _, fieldArgs) => {
  const $input = fieldArgs.getRaw(["input", "repositoryCollaborator"]),
    $observer = context().get("observer"),
    $db = context().get("db");
  sideEffect([$input, $observer, $db], async ([input, observer, db]) => {
    if (!observer) throw Error("Unauthorized");
    const repositoryId = input.repositoryId,
      repository = await db.query.repositoryTable.findFirst({
        where(table, {
          eq
        }) {
          return eq(table.id, repositoryId);
        },
        with: {
          collaborators: !0
        }
      });
    if (!repository) throw Error("Unauthorized");
    const isOwner = repository.ownerId === observer.id,
      isAdminCollaborator = repository.collaborators.find(rc => rc.userId === observer.id)?.permission === "admin";
    if (!isOwner && !isAdminCollaborator) throw Error("Unauthorized");
    if (repository.organizationId) {
      if (!(await isWithinLimit({
        organizationId: repository.organizationId
      }, FEATURE_KEYS.MAX_COLLABORATORS, repository.collaborators.length, billingBypassOrgIds))) throw Error("Collaborator limit reached. Upgrade your plan for more collaborators");
    }
  });
  return plan();
};
function oldPlan2(_, args) {
  const $insert = pgInsertSingle(spec_resource_pull_request_reviewPgResource);
  args.apply($insert);
  return object({
    result: $insert
  });
}
const hasReadAccess = async (db, repositoryId, userId) => {
  const repository = await db.query.repositoryTable.findFirst({
    where(table, {
      eq
    }) {
      return eq(table.id, repositoryId);
    },
    with: {
      collaborators: {
        where(table, {
          eq
        }) {
          return eq(table.userId, userId);
        }
      }
    }
  });
  if (!repository) return !1;
  if (repository.visibility === "public") return !0;
  const isOwner = repository.ownerId === userId,
    isCollaborator = repository.collaborators.length > 0;
  return isOwner || isCollaborator;
};
const planWrapper2 = (plan, _, fieldArgs) => {
  const $input = fieldArgs.getRaw(["input", "pullRequestReview"]),
    $observer = context().get("observer"),
    $db = context().get("db");
  sideEffect([$input, $observer, $db], async ([input, observer, db]) => {
    if (!observer) throw Error("Unauthorized");
    {
      const pullRequestId = input.pullRequestId,
        pullRequest = await db.query.pullRequestTable.findFirst({
          where(table, {
            eq
          }) {
            return eq(table.id, pullRequestId);
          }
        });
      if (!pullRequest) throw Error("Unauthorized");
      if (!(await hasReadAccess(db, pullRequest.repositoryId, observer.id))) throw Error("Unauthorized");
    }
  });
  return plan();
};
function oldPlan3(_, args) {
  const $insert = pgInsertSingle(spec_resource_userPgResource);
  args.apply($insert);
  return object({
    result: $insert
  });
}
const planWrapper3 = (plan, _, fieldArgs) => {
  const $input = fieldArgs.getRaw(["input", "user"]),
    $observer = context().get("observer");
  sideEffect([$input, $observer], async ([input, observer]) => {
    if (!observer) throw Error("Unauthorized");
    throw Error("Unauthorized");
  });
  return plan();
};
function oldPlan4(_, args) {
  const $insert = pgInsertSingle(spec_resource_pull_request_commentPgResource);
  args.apply($insert);
  return object({
    result: $insert
  });
}
const planWrapper4 = (plan, _, fieldArgs) => {
  const $input = fieldArgs.getRaw(["input", "pullRequestComment"]),
    $observer = context().get("observer"),
    $db = context().get("db");
  sideEffect([$input, $observer, $db], async ([input, observer, db]) => {
    if (!observer) throw Error("Unauthorized");
    {
      const pullRequestId = input.pullRequestId,
        pullRequest = await db.query.pullRequestTable.findFirst({
          where(table, {
            eq
          }) {
            return eq(table.id, pullRequestId);
          }
        });
      if (!pullRequest) throw Error("Unauthorized");
      if (!(await hasReadAccess(db, pullRequest.repositoryId, observer.id))) throw Error("Unauthorized");
    }
  });
  return plan();
};
function oldPlan5(_, args) {
  const $insert = pgInsertSingle(spec_resource_organizationPgResource);
  args.apply($insert);
  return object({
    result: $insert
  });
}
function getDefaultOrganization(organizations) {
  if (organizations.length === 0) return null;
  const personalOrg = organizations.find(org => org.type === "personal");
  if (personalOrg) return personalOrg;
  return organizations[0];
}
const planWrapper5 = (plan, _, fieldArgs) => {
  const $input = fieldArgs.getRaw(["input", "organization"]),
    $observer = context().get("observer"),
    $organizations = context().get("organizations"),
    $authzCache = context().get("authzCache");
  sideEffect([$input, $observer, $organizations, $authzCache], async ([input, observer, organizations, authzCache]) => {
    if (!observer) throw Error("Unauthorized");
    {
      const targetOrgId = input.idpOrganizationId ?? getDefaultOrganization(organizations)?.id;
      if (!targetOrgId) throw Error("No organization available");
      const {
        validateOrgExists
      } = await import("lib/idp/validateOrg");
      if (!(await validateOrgExists(targetOrgId))) throw Error("Organization not found in identity provider");
    }
  });
  return plan();
};
function oldPlan7(_, args) {
  const $insert = pgInsertSingle(spec_resource_repositoryPgResource);
  args.apply($insert);
  return object({
    result: $insert
  });
}
const planWrapper6 = (plan, _, fieldArgs) => {
  const $input = fieldArgs.getRaw(["input", "repository"]),
    $observer = context().get("observer"),
    $organizations = context().get("organizations"),
    $db = context().get("db"),
    $withPgClient = context().get("withPgClient");
  sideEffect([$input, $observer, $organizations, $db, $withPgClient], async ([input, observer, organizations, db, withPgClient]) => {
    if (!observer) throw Error("Unauthorized");
    const organizationId = input.organizationId;
    if (!organizationId) return;
    const organization = await db.query.organizationTable.findFirst({
      where(table, {
        eq
      }) {
        return eq(table.id, organizationId);
      }
    });
    if (!organization) throw Error("Organization not found");
    if (!organizations.some(org => org.id === organization.idpOrganizationId)) throw Error("Unauthorized");
    const privateRepos = await withPgClient(null, async client => {
      return (await client.query({
        text: "SELECT count(*)::int as total FROM repository WHERE organization_id = $1 AND visibility = 'private'",
        values: [organizationId]
      })).rows[0]?.total ?? 0;
    });
    if (input.visibility === "private") {
      if (!(await isWithinLimit({
        organizationId
      }, FEATURE_KEYS.MAX_PRIVATE_REPOS, privateRepos, billingBypassOrgIds))) throw Error("Maximum number of private repositories reached for your plan");
    }
  });
  return plan();
};
function oldPlan6(...planParams) {
  const smartPlan = (...overrideParams) => {
      const args = [...overrideParams.concat(planParams.slice(overrideParams.length))],
        $prev = oldPlan7.apply(this, args);
      if (!($prev instanceof ExecutableStep)) {
        console.error(`Wrapped a plan function at Mutation.createRepository, but that function did not return a step!
${String(oldPlan7)}`);
        throw Error("Wrapped a plan function, but that function did not return a step!");
      }
      args[1].autoApply($prev);
      return $prev;
    },
    [$source, fieldArgs, info] = planParams,
    $newPlan = planWrapper6(smartPlan, $source, fieldArgs, info);
  if ($newPlan === void 0) throw Error("Your plan wrapper didn't return anything; it must return a step or null!");
  if ($newPlan !== null && !isStep($newPlan)) throw Error(`Your plan wrapper returned something other than a step... It must return a step (or null). (Returned: ${inspect($newPlan)})`);
  return $newPlan;
}
const planWrapper7 = (plan, $record) => {
  if (!false) return plan();
  const $db = context().get("db");
  sideEffect([$record, $db], async ([record, db]) => {
    if (!record?.id) return;
    const repo = await db.query.repositoryTable.findFirst({
      where(table, {
        eq
      }) {
        return eq(table.id, record.id);
      }
    });
    if (repo?.organizationId) await indexRepository(repo, repo.organizationId);
  });
  return plan();
};
function oldPlan9(_, args) {
  const $insert = pgInsertSingle(spec_resource_pull_requestPgResource);
  args.apply($insert);
  return object({
    result: $insert
  });
}
const hasWriteAccess = async (db, repositoryId, userId) => {
  const repository = await db.query.repositoryTable.findFirst({
    where(table, {
      eq
    }) {
      return eq(table.id, repositoryId);
    },
    with: {
      collaborators: {
        where(table, {
          eq
        }) {
          return eq(table.userId, userId);
        }
      }
    }
  });
  if (!repository) return !1;
  const isOwner = repository.ownerId === userId,
    collaborator = repository.collaborators[0],
    hasWritePermission = collaborator?.permission === "write" || collaborator?.permission === "admin";
  return isOwner || hasWritePermission;
};
const planWrapper8 = (plan, _, fieldArgs) => {
  const $input = fieldArgs.getRaw(["input", "pullRequest"]),
    $observer = context().get("observer"),
    $db = context().get("db");
  sideEffect([$input, $observer, $db], async ([input, observer, db]) => {
    if (!observer) throw Error("Unauthorized");
    {
      const repositoryId = input.repositoryId;
      if (!(await hasWriteAccess(db, repositoryId, observer.id))) throw Error("Unauthorized");
    }
  });
  return plan();
};
function oldPlan8(...planParams) {
  const smartPlan = (...overrideParams) => {
      const args = [...overrideParams.concat(planParams.slice(overrideParams.length))],
        $prev = oldPlan9.apply(this, args);
      if (!($prev instanceof ExecutableStep)) {
        console.error(`Wrapped a plan function at Mutation.createPullRequest, but that function did not return a step!
${String(oldPlan9)}`);
        throw Error("Wrapped a plan function, but that function did not return a step!");
      }
      args[1].autoApply($prev);
      return $prev;
    },
    [$source, fieldArgs, info] = planParams,
    $newPlan = planWrapper8(smartPlan, $source, fieldArgs, info);
  if ($newPlan === void 0) throw Error("Your plan wrapper didn't return anything; it must return a step or null!");
  if ($newPlan !== null && !isStep($newPlan)) throw Error(`Your plan wrapper returned something other than a step... It must return a step (or null). (Returned: ${inspect($newPlan)})`);
  return $newPlan;
}
const planWrapper9 = (plan, $record) => {
  if (!false) return plan();
  const $db = context().get("db");
  sideEffect([$record, $db], async ([record, db]) => {
    if (!record?.id) return;
    const pr = await db.query.pullRequestTable.findFirst({
      where(table, {
        eq
      }) {
        return eq(table.id, record.id);
      },
      with: {
        repository: !0
      }
    });
    if (pr?.repository?.organizationId) await indexPullRequest(pr, pr.repository.organizationId);
  });
  return plan();
};
const specFromArgs_RepositoryRelationshipMetadatum = args => {
  const $nodeId = args.getRaw(["input", "id"]);
  return specFromNodeId(nodeIdHandler_RepositoryRelationshipMetadatum, $nodeId);
};
function applyInputToUpdateOrDelete(_, $object) {
  return $object;
}
const specFromArgs_ExternalDependency = args => {
  const $nodeId = args.getRaw(["input", "id"]);
  return specFromNodeId(nodeIdHandler_ExternalDependency, $nodeId);
};
const specFromArgs_RepositoryCollaborator = args => {
  const $nodeId = args.getRaw(["input", "id"]);
  return specFromNodeId(nodeIdHandler_RepositoryCollaborator, $nodeId);
};
const oldPlan10 = (_$root, args) => {
  const $update = pgUpdateSingle(spec_resource_repository_collaboratorPgResource, {
    repository_id: args.getRaw(['input', "repositoryId"]),
    user_id: args.getRaw(['input', "userId"])
  });
  args.apply($update);
  return object({
    result: $update
  });
};
const planWrapper10 = (plan, _, fieldArgs) => {
  const $input = fieldArgs.getRaw(["input", "patch"]),
    $observer = context().get("observer"),
    $db = context().get("db");
  sideEffect([$input, $observer, $db], async ([input, observer, db]) => {
    if (!observer) throw Error("Unauthorized");
    const repositoryId = input.repositoryId,
      repository = await db.query.repositoryTable.findFirst({
        where(table, {
          eq
        }) {
          return eq(table.id, repositoryId);
        },
        with: {
          collaborators: !0
        }
      });
    if (!repository) throw Error("Unauthorized");
    const isOwner = repository.ownerId === observer.id,
      isAdminCollaborator = repository.collaborators.find(rc => rc.userId === observer.id)?.permission === "admin";
    if (!isOwner && !isAdminCollaborator) throw Error("Unauthorized");
    if (input.userId === repository.ownerId) throw Error("Cannot modify owner permissions");
  });
  return plan();
};
const specFromArgs_RepositoryRelationshipType = args => {
  const $nodeId = args.getRaw(["input", "id"]);
  return specFromNodeId(nodeIdHandler_RepositoryRelationshipType, $nodeId);
};
const specFromArgs_PullRequestReview = args => {
  const $nodeId = args.getRaw(["input", "id"]);
  return specFromNodeId(nodeIdHandler_PullRequestReview, $nodeId);
};
const oldPlan11 = (_$root, args) => {
  const $update = pgUpdateSingle(spec_resource_pull_request_reviewPgResource, {
    id: args.getRaw(['input', "rowId"])
  });
  args.apply($update);
  return object({
    result: $update
  });
};
const planWrapper11 = (plan, _, fieldArgs) => {
  const $input = fieldArgs.getRaw(["input", "rowId"]),
    $observer = context().get("observer"),
    $db = context().get("db");
  sideEffect([$input, $observer, $db], async ([input, observer, db]) => {
    if (!observer) throw Error("Unauthorized");
    {
      const review = await db.query.pullRequestReviewTable.findFirst({
        where(table, {
          eq
        }) {
          return eq(table.id, input);
        },
        with: {
          pullRequest: !0
        }
      });
      if (!review) throw Error("Unauthorized");
      const isReviewer = review.reviewerId === observer.id,
        isPRAuthor = review.pullRequest.authorId === observer.id;
      if (!isReviewer) throw Error("Unauthorized");
    }
  });
  return plan();
};
const specFromArgs_User = args => {
  const $nodeId = args.getRaw(["input", "id"]);
  return specFromNodeId(nodeIdHandler_User, $nodeId);
};
const oldPlan12 = (_$root, args) => {
  const $update = pgUpdateSingle(spec_resource_userPgResource, {
    id: args.getRaw(['input', "rowId"])
  });
  args.apply($update);
  return object({
    result: $update
  });
};
const planWrapper12 = (plan, _, fieldArgs) => {
  const $input = fieldArgs.getRaw(["input", "rowId"]),
    $observer = context().get("observer");
  sideEffect([$input, $observer], async ([input, observer]) => {
    if (!observer) throw Error("Unauthorized");
    if (input !== observer.id) throw Error("Unauthorized");
  });
  return plan();
};
const specFromArgs_PullRequestComment = args => {
  const $nodeId = args.getRaw(["input", "id"]);
  return specFromNodeId(nodeIdHandler_PullRequestComment, $nodeId);
};
const oldPlan13 = (_$root, args) => {
  const $update = pgUpdateSingle(spec_resource_pull_request_commentPgResource, {
    id: args.getRaw(['input', "rowId"])
  });
  args.apply($update);
  return object({
    result: $update
  });
};
const planWrapper13 = (plan, _, fieldArgs) => {
  const $input = fieldArgs.getRaw(["input", "rowId"]),
    $observer = context().get("observer"),
    $db = context().get("db");
  sideEffect([$input, $observer, $db], async ([input, observer, db]) => {
    if (!observer) throw Error("Unauthorized");
    {
      const comment = await db.query.pullRequestCommentTable.findFirst({
        where(table, {
          eq
        }) {
          return eq(table.id, input);
        },
        with: {
          pullRequest: !0
        }
      });
      if (!comment) throw Error("Unauthorized");
      const isAuthor = comment.authorId === observer.id,
        isPRAuthor = comment.pullRequest.authorId === observer.id;
      if (!isAuthor) throw Error("Unauthorized");
    }
  });
  return plan();
};
const specFromArgs_RepositoryRelationship = args => {
  const $nodeId = args.getRaw(["input", "id"]);
  return specFromNodeId(nodeIdHandler_RepositoryRelationship, $nodeId);
};
const specFromArgs_Organization = args => {
  const $nodeId = args.getRaw(["input", "id"]);
  return specFromNodeId(nodeIdHandler_Organization, $nodeId);
};
const oldPlan14 = (_$root, args) => {
  const $update = pgUpdateSingle(spec_resource_organizationPgResource, {
    id: args.getRaw(['input', "rowId"])
  });
  args.apply($update);
  return object({
    result: $update
  });
};
const planWrapper14 = (plan, _, fieldArgs) => {
  const $input = fieldArgs.getRaw(["input", "rowId"]),
    $observer = context().get("observer"),
    $organizations = context().get("organizations"),
    $authzCache = context().get("authzCache");
  sideEffect([$input, $observer, $organizations, $authzCache], async ([input, observer, organizations, authzCache]) => {
    if (!observer) throw Error("Unauthorized");
    {
      const {
          checkPermission,
          AUTHZ_API_URL
        } = await import("lib/authz"),
        requiredPermission = "admin";
      if (!(await checkPermission(AUTHZ_API_URL, observer.id, "organization", input, requiredPermission, authzCache))) throw Error("Unauthorized");
    }
  });
  return plan();
};
const specFromArgs_Repository = args => {
  const $nodeId = args.getRaw(["input", "id"]);
  return specFromNodeId(nodeIdHandler_Repository, $nodeId);
};
const oldPlan16 = (_$root, args) => {
  const $update = pgUpdateSingle(spec_resource_repositoryPgResource, {
    id: args.getRaw(['input', "rowId"])
  });
  args.apply($update);
  return object({
    result: $update
  });
};
const planWrapper15 = (plan, _, fieldArgs) => {
  const $input = fieldArgs.getRaw(["input", "rowId"]),
    $observer = context().get("observer"),
    $db = context().get("db");
  sideEffect([$input, $observer, $db], async ([input, observer, db]) => {
    if (!observer) throw Error("Unauthorized");
    const repository = await db.query.repositoryTable.findFirst({
      where(table, {
        eq
      }) {
        return eq(table.id, input);
      },
      with: {
        collaborators: {
          where(table, {
            eq
          }) {
            return eq(table.userId, observer.id);
          }
        }
      }
    });
    if (!repository) throw Error("Unauthorized");
    const isOwner = repository.ownerId === observer.id,
      isAdminCollaborator = repository.collaborators[0]?.permission === "admin";
    if (!isOwner && !isAdminCollaborator) throw Error("Unauthorized");
  });
  return plan();
};
function oldPlan15(...planParams) {
  const smartPlan = (...overrideParams) => {
      const args = [...overrideParams.concat(planParams.slice(overrideParams.length))],
        $prev = oldPlan16.apply(this, args);
      if (!($prev instanceof ExecutableStep)) {
        console.error(`Wrapped a plan function at Mutation.updateRepository, but that function did not return a step!
${String(oldPlan16)}`);
        throw Error("Wrapped a plan function, but that function did not return a step!");
      }
      args[1].autoApply($prev);
      return $prev;
    },
    [$source, fieldArgs, info] = planParams,
    $newPlan = planWrapper15(smartPlan, $source, fieldArgs, info);
  if ($newPlan === void 0) throw Error("Your plan wrapper didn't return anything; it must return a step or null!");
  if ($newPlan !== null && !isStep($newPlan)) throw Error(`Your plan wrapper returned something other than a step... It must return a step (or null). (Returned: ${inspect($newPlan)})`);
  return $newPlan;
}
const specFromArgs_PullRequest = args => {
  const $nodeId = args.getRaw(["input", "id"]);
  return specFromNodeId(nodeIdHandler_PullRequest, $nodeId);
};
const oldPlan18 = (_$root, args) => {
  const $update = pgUpdateSingle(spec_resource_pull_requestPgResource, {
    id: args.getRaw(['input', "rowId"])
  });
  args.apply($update);
  return object({
    result: $update
  });
};
const planWrapper17 = (plan, _, fieldArgs) => {
  const $input = fieldArgs.getRaw(["input", "rowId"]),
    $observer = context().get("observer"),
    $db = context().get("db");
  sideEffect([$input, $observer, $db], async ([input, observer, db]) => {
    if (!observer) throw Error("Unauthorized");
    {
      const pullRequest = await db.query.pullRequestTable.findFirst({
        where(table, {
          eq
        }) {
          return eq(table.id, input);
        },
        with: {
          repository: {
            with: {
              collaborators: {
                where(table, {
                  eq
                }) {
                  return eq(table.userId, observer.id);
                }
              }
            }
          }
        }
      });
      if (!pullRequest) throw Error("Unauthorized");
      const isAuthor = pullRequest.authorId === observer.id,
        isOwner = pullRequest.repository.ownerId === observer.id,
        isAdmin = pullRequest.repository.collaborators[0]?.permission === "admin";
      if (!isAuthor && !isOwner && !isAdmin) throw Error("Unauthorized");
    }
  });
  return plan();
};
function oldPlan17(...planParams) {
  const smartPlan = (...overrideParams) => {
      const args = [...overrideParams.concat(planParams.slice(overrideParams.length))],
        $prev = oldPlan18.apply(this, args);
      if (!($prev instanceof ExecutableStep)) {
        console.error(`Wrapped a plan function at Mutation.updatePullRequest, but that function did not return a step!
${String(oldPlan18)}`);
        throw Error("Wrapped a plan function, but that function did not return a step!");
      }
      args[1].autoApply($prev);
      return $prev;
    },
    [$source, fieldArgs, info] = planParams,
    $newPlan = planWrapper17(smartPlan, $source, fieldArgs, info);
  if ($newPlan === void 0) throw Error("Your plan wrapper didn't return anything; it must return a step or null!");
  if ($newPlan !== null && !isStep($newPlan)) throw Error(`Your plan wrapper returned something other than a step... It must return a step (or null). (Returned: ${inspect($newPlan)})`);
  return $newPlan;
}
const oldPlan19 = (_$root, args) => {
  const $delete = pgDeleteSingle(spec_resource_repository_collaboratorPgResource, {
    repository_id: args.getRaw(['input', "repositoryId"]),
    user_id: args.getRaw(['input', "userId"])
  });
  args.apply($delete);
  return object({
    result: $delete
  });
};
const planWrapper19 = (plan, _, fieldArgs) => {
  const $repositoryId = fieldArgs.getRaw(["input", "repositoryId"]),
    $userId = fieldArgs.getRaw(["input", "userId"]),
    $observer = context().get("observer"),
    $db = context().get("db");
  sideEffect([$repositoryId, $userId, $observer, $db], async ([repositoryId, userId, observer, db]) => {
    if (!observer) throw Error("Unauthorized");
    const repository = await db.query.repositoryTable.findFirst({
      where(table, {
        eq
      }) {
        return eq(table.id, repositoryId);
      },
      with: {
        collaborators: !0
      }
    });
    if (!repository) throw Error("Unauthorized");
    const isOwner = repository.ownerId === observer.id,
      isAdminCollaborator = repository.collaborators.find(rc => rc.userId === observer.id)?.permission === "admin";
    if (!isOwner && !isAdminCollaborator) throw Error("Unauthorized");
    if (userId === repository.ownerId) throw Error("Cannot remove owner");
  });
  return plan();
};
const oldPlan20 = (_$root, args) => {
  const $delete = pgDeleteSingle(spec_resource_pull_request_reviewPgResource, {
    id: args.getRaw(['input', "rowId"])
  });
  args.apply($delete);
  return object({
    result: $delete
  });
};
const planWrapper20 = (plan, _, fieldArgs) => {
  const $input = fieldArgs.getRaw(["input", "rowId"]),
    $observer = context().get("observer"),
    $db = context().get("db");
  sideEffect([$input, $observer, $db], async ([input, observer, db]) => {
    if (!observer) throw Error("Unauthorized");
    {
      const review = await db.query.pullRequestReviewTable.findFirst({
        where(table, {
          eq
        }) {
          return eq(table.id, input);
        },
        with: {
          pullRequest: !0
        }
      });
      if (!review) throw Error("Unauthorized");
      const isReviewer = review.reviewerId === observer.id,
        isPRAuthor = review.pullRequest.authorId === observer.id;
      if (!isReviewer && !isPRAuthor) throw Error("Unauthorized");
    }
  });
  return plan();
};
const oldPlan21 = (_$root, args) => {
  const $delete = pgDeleteSingle(spec_resource_userPgResource, {
    id: args.getRaw(['input', "rowId"])
  });
  args.apply($delete);
  return object({
    result: $delete
  });
};
const planWrapper21 = (plan, _, fieldArgs) => {
  const $input = fieldArgs.getRaw(["input", "rowId"]),
    $observer = context().get("observer");
  sideEffect([$input, $observer], async ([input, observer]) => {
    if (!observer) throw Error("Unauthorized");
    if (input !== observer.id) throw Error("Unauthorized");
  });
  return plan();
};
const oldPlan22 = (_$root, args) => {
  const $delete = pgDeleteSingle(spec_resource_pull_request_commentPgResource, {
    id: args.getRaw(['input', "rowId"])
  });
  args.apply($delete);
  return object({
    result: $delete
  });
};
const planWrapper22 = (plan, _, fieldArgs) => {
  const $input = fieldArgs.getRaw(["input", "rowId"]),
    $observer = context().get("observer"),
    $db = context().get("db");
  sideEffect([$input, $observer, $db], async ([input, observer, db]) => {
    if (!observer) throw Error("Unauthorized");
    {
      const comment = await db.query.pullRequestCommentTable.findFirst({
        where(table, {
          eq
        }) {
          return eq(table.id, input);
        },
        with: {
          pullRequest: !0
        }
      });
      if (!comment) throw Error("Unauthorized");
      const isAuthor = comment.authorId === observer.id,
        isPRAuthor = comment.pullRequest.authorId === observer.id;
      if (!isAuthor && !isPRAuthor) throw Error("Unauthorized");
    }
  });
  return plan();
};
const oldPlan23 = (_$root, args) => {
  const $delete = pgDeleteSingle(spec_resource_organizationPgResource, {
    id: args.getRaw(['input', "rowId"])
  });
  args.apply($delete);
  return object({
    result: $delete
  });
};
const planWrapper23 = (plan, _, fieldArgs) => {
  const $input = fieldArgs.getRaw(["input", "rowId"]),
    $observer = context().get("observer"),
    $organizations = context().get("organizations"),
    $authzCache = context().get("authzCache");
  sideEffect([$input, $observer, $organizations, $authzCache], async ([input, observer, organizations, authzCache]) => {
    if (!observer) throw Error("Unauthorized");
    {
      const {
          checkPermission,
          AUTHZ_API_URL
        } = await import("lib/authz"),
        requiredPermission = "owner";
      if (!(await checkPermission(AUTHZ_API_URL, observer.id, "organization", input, requiredPermission, authzCache))) throw Error("Unauthorized");
    }
  });
  return plan();
};
const oldPlan25 = (_$root, args) => {
  const $delete = pgDeleteSingle(spec_resource_repositoryPgResource, {
    id: args.getRaw(['input', "rowId"])
  });
  args.apply($delete);
  return object({
    result: $delete
  });
};
const planWrapper24 = (plan, _, fieldArgs) => {
  const $input = fieldArgs.getRaw(["input", "rowId"]),
    $observer = context().get("observer"),
    $db = context().get("db");
  sideEffect([$input, $observer, $db], async ([input, observer, db]) => {
    if (!observer) throw Error("Unauthorized");
    const repository = await db.query.repositoryTable.findFirst({
      where(table, {
        eq
      }) {
        return eq(table.id, input);
      },
      with: {
        collaborators: {
          where(table, {
            eq
          }) {
            return eq(table.userId, observer.id);
          }
        }
      }
    });
    if (!repository) throw Error("Unauthorized");
    const isOwner = repository.ownerId === observer.id,
      isAdminCollaborator = repository.collaborators[0]?.permission === "admin";
    if (!isOwner) throw Error("Unauthorized");
  });
  return plan();
};
function oldPlan24(...planParams) {
  const smartPlan = (...overrideParams) => {
      const args = [...overrideParams.concat(planParams.slice(overrideParams.length))],
        $prev = oldPlan25.apply(this, args);
      if (!($prev instanceof ExecutableStep)) {
        console.error(`Wrapped a plan function at Mutation.deleteRepository, but that function did not return a step!
${String(oldPlan25)}`);
        throw Error("Wrapped a plan function, but that function did not return a step!");
      }
      args[1].autoApply($prev);
      return $prev;
    },
    [$source, fieldArgs, info] = planParams,
    $newPlan = planWrapper24(smartPlan, $source, fieldArgs, info);
  if ($newPlan === void 0) throw Error("Your plan wrapper didn't return anything; it must return a step or null!");
  if ($newPlan !== null && !isStep($newPlan)) throw Error(`Your plan wrapper returned something other than a step... It must return a step (or null). (Returned: ${inspect($newPlan)})`);
  return $newPlan;
}
const planWrapper25 = (plan, _, fieldArgs) => {
  if (!false) return plan();
  const $input = fieldArgs.getRaw(["input", "rowId"]);
  sideEffect([$input], async ([repoId]) => {
    if (repoId) await deleteRepositoryFromIndex(repoId);
  });
  return plan();
};
const oldPlan27 = (_$root, args) => {
  const $delete = pgDeleteSingle(spec_resource_pull_requestPgResource, {
    id: args.getRaw(['input', "rowId"])
  });
  args.apply($delete);
  return object({
    result: $delete
  });
};
const planWrapper26 = (plan, _, fieldArgs) => {
  const $input = fieldArgs.getRaw(["input", "rowId"]),
    $observer = context().get("observer"),
    $db = context().get("db");
  sideEffect([$input, $observer, $db], async ([input, observer, db]) => {
    if (!observer) throw Error("Unauthorized");
    {
      const pullRequest = await db.query.pullRequestTable.findFirst({
        where(table, {
          eq
        }) {
          return eq(table.id, input);
        },
        with: {
          repository: {
            with: {
              collaborators: {
                where(table, {
                  eq
                }) {
                  return eq(table.userId, observer.id);
                }
              }
            }
          }
        }
      });
      if (!pullRequest) throw Error("Unauthorized");
      const isAuthor = pullRequest.authorId === observer.id,
        isOwner = pullRequest.repository.ownerId === observer.id,
        isAdmin = pullRequest.repository.collaborators[0]?.permission === "admin";
      if (!isAuthor && !isOwner) throw Error("Unauthorized");
    }
  });
  return plan();
};
function oldPlan26(...planParams) {
  const smartPlan = (...overrideParams) => {
      const args = [...overrideParams.concat(planParams.slice(overrideParams.length))],
        $prev = oldPlan27.apply(this, args);
      if (!($prev instanceof ExecutableStep)) {
        console.error(`Wrapped a plan function at Mutation.deletePullRequest, but that function did not return a step!
${String(oldPlan27)}`);
        throw Error("Wrapped a plan function, but that function did not return a step!");
      }
      args[1].autoApply($prev);
      return $prev;
    },
    [$source, fieldArgs, info] = planParams,
    $newPlan = planWrapper26(smartPlan, $source, fieldArgs, info);
  if ($newPlan === void 0) throw Error("Your plan wrapper didn't return anything; it must return a step or null!");
  if ($newPlan !== null && !isStep($newPlan)) throw Error(`Your plan wrapper returned something other than a step... It must return a step (or null). (Returned: ${inspect($newPlan)})`);
  return $newPlan;
}
const planWrapper27 = (plan, _, fieldArgs) => {
  if (!false) return plan();
  const $input = fieldArgs.getRaw(["input", "rowId"]);
  sideEffect([$input], async ([prId]) => {
    if (prId) await deletePullRequestFromIndex(prId);
  });
  return plan();
};
export const typeDefs = /* GraphQL */`"""An object with a globally unique \`ID\`."""
interface Node {
  """
  A globally unique identifier. Can be used in various places throughout the system to identify this single value.
  """
  id: ID!
}

type RepositoryRelationshipMetadatum implements Node {
  """
  A globally unique identifier. Can be used in various places throughout the system to identify this single value.
  """
  id: ID!
  rowId: UUID!
  relationshipId: UUID!
  key: String!
  value: String!
  createdAt: Datetime!

  """
  Reads a single \`RepositoryRelationship\` that is related to this \`RepositoryRelationshipMetadatum\`.
  """
  relationship: RepositoryRelationship
}

"""
A universally unique identifier as defined by [RFC 4122](https://tools.ietf.org/html/rfc4122).
"""
scalar UUID

"""
A point in time as described by the [ISO
8601](https://en.wikipedia.org/wiki/ISO_8601) and, if it has a timezone, [RFC
3339](https://datatracker.ietf.org/doc/html/rfc3339) standards. Input values
that do not conform to both ISO 8601 and RFC 3339 may be coerced, which may lead
to unexpected results.
"""
scalar Datetime

type RepositoryRelationship implements Node {
  """
  A globally unique identifier. Can be used in various places throughout the system to identify this single value.
  """
  id: ID!
  rowId: UUID!
  sourceRepositoryId: UUID!
  targetRepositoryId: UUID!
  relationshipTypeId: UUID!
  detectionSource: String!
  confidence: Float!
  versionConstraint: String
  branch: String
  createdAt: Datetime!
  updatedAt: Datetime!

  """
  Reads a single \`RepositoryRelationshipType\` that is related to this \`RepositoryRelationship\`.
  """
  relationshipType: RepositoryRelationshipType

  """
  Reads a single \`Repository\` that is related to this \`RepositoryRelationship\`.
  """
  sourceRepository: Repository

  """
  Reads a single \`Repository\` that is related to this \`RepositoryRelationship\`.
  """
  targetRepository: Repository

  """
  Reads and enables pagination through a set of \`RepositoryRelationshipMetadatum\`.
  """
  repositoryRelationshipMetadataByRelationshipId(
    """Only read the first \`n\` values of the set."""
    first: Int

    """Only read the last \`n\` values of the set."""
    last: Int

    """
    Skip the first \`n\` values from our \`after\` cursor, an alternative to cursor
    based pagination. May not be used with \`last\`.
    """
    offset: Int

    """Read all values in the set before (above) this cursor."""
    before: Cursor

    """Read all values in the set after (below) this cursor."""
    after: Cursor

    """
    A condition to be used in determining which values should be returned by the collection.
    """
    condition: RepositoryRelationshipMetadatumCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: RepositoryRelationshipMetadatumFilter

    """The method to use when ordering \`RepositoryRelationshipMetadatum\`."""
    orderBy: [RepositoryRelationshipMetadatumOrderBy!] = [PRIMARY_KEY_ASC]
  ): RepositoryRelationshipMetadatumConnection!
}

type RepositoryRelationshipType implements Node {
  """
  A globally unique identifier. Can be used in various places throughout the system to identify this single value.
  """
  id: ID!
  rowId: UUID!
  name: String!
  description: String
  isDirected: Boolean!
  organizationId: UUID
  createdAt: Datetime!

  """
  Reads a single \`Organization\` that is related to this \`RepositoryRelationshipType\`.
  """
  organization: Organization

  """
  Reads and enables pagination through a set of \`RepositoryRelationship\`.
  """
  repositoryRelationshipsByRelationshipTypeId(
    """Only read the first \`n\` values of the set."""
    first: Int

    """Only read the last \`n\` values of the set."""
    last: Int

    """
    Skip the first \`n\` values from our \`after\` cursor, an alternative to cursor
    based pagination. May not be used with \`last\`.
    """
    offset: Int

    """Read all values in the set before (above) this cursor."""
    before: Cursor

    """Read all values in the set after (below) this cursor."""
    after: Cursor

    """
    A condition to be used in determining which values should be returned by the collection.
    """
    condition: RepositoryRelationshipCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: RepositoryRelationshipFilter

    """The method to use when ordering \`RepositoryRelationship\`."""
    orderBy: [RepositoryRelationshipOrderBy!] = [PRIMARY_KEY_ASC]
  ): RepositoryRelationshipConnection!
}

type Organization implements Node {
  """
  A globally unique identifier. Can be used in various places throughout the system to identify this single value.
  """
  id: ID!
  rowId: UUID!
  description: String
  avatarUrl: String
  createdAt: Datetime!
  updatedAt: Datetime!
  idpOrganizationId: String!
  subscriptionId: String
  billingAccountId: String
  deletedAt: Datetime
  deletionReason: String

  """Reads and enables pagination through a set of \`Repository\`."""
  repositories(
    """Only read the first \`n\` values of the set."""
    first: Int

    """Only read the last \`n\` values of the set."""
    last: Int

    """
    Skip the first \`n\` values from our \`after\` cursor, an alternative to cursor
    based pagination. May not be used with \`last\`.
    """
    offset: Int

    """Read all values in the set before (above) this cursor."""
    before: Cursor

    """Read all values in the set after (below) this cursor."""
    after: Cursor

    """
    A condition to be used in determining which values should be returned by the collection.
    """
    condition: RepositoryCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: RepositoryFilter

    """The method to use when ordering \`Repository\`."""
    orderBy: [RepositoryOrderBy!] = [PRIMARY_KEY_ASC]
  ): RepositoryConnection!

  """
  Reads and enables pagination through a set of \`RepositoryRelationshipType\`.
  """
  repositoryRelationshipTypes(
    """Only read the first \`n\` values of the set."""
    first: Int

    """Only read the last \`n\` values of the set."""
    last: Int

    """
    Skip the first \`n\` values from our \`after\` cursor, an alternative to cursor
    based pagination. May not be used with \`last\`.
    """
    offset: Int

    """Read all values in the set before (above) this cursor."""
    before: Cursor

    """Read all values in the set after (below) this cursor."""
    after: Cursor

    """
    A condition to be used in determining which values should be returned by the collection.
    """
    condition: RepositoryRelationshipTypeCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: RepositoryRelationshipTypeFilter

    """The method to use when ordering \`RepositoryRelationshipType\`."""
    orderBy: [RepositoryRelationshipTypeOrderBy!] = [PRIMARY_KEY_ASC]
  ): RepositoryRelationshipTypeConnection!
}

"""A connection to a list of \`Repository\` values."""
type RepositoryConnection {
  """A list of \`Repository\` objects."""
  nodes: [Repository!]!

  """
  A list of edges which contains the \`Repository\` and cursor to aid in pagination.
  """
  edges: [RepositoryEdge!]!

  """Information to aid in pagination."""
  pageInfo: PageInfo!

  """The count of *all* \`Repository\` you could get from the connection."""
  totalCount: Int!

  """
  Aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  aggregates: RepositoryAggregates

  """
  Grouped aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  groupedAggregates(
    """The method to use when grouping \`Repository\` for these aggregates."""
    groupBy: [RepositoryGroupBy!]!

    """Conditions on the grouped aggregates."""
    having: RepositoryHavingInput
  ): [RepositoryAggregates!]
}

type Repository implements Node {
  """
  A globally unique identifier. Can be used in various places throughout the system to identify this single value.
  """
  id: ID!
  rowId: UUID!
  ownerId: UUID!
  organizationId: UUID
  name: String!
  slug: String!
  description: String
  visibility: Visibility!
  defaultBranch: String!
  createdAt: Datetime!
  updatedAt: Datetime!

  """Reads a single \`Organization\` that is related to this \`Repository\`."""
  organization: Organization

  """Reads a single \`User\` that is related to this \`Repository\`."""
  owner: User

  """
  Reads and enables pagination through a set of \`RepositoryCollaborator\`.
  """
  repositoryCollaborators(
    """Only read the first \`n\` values of the set."""
    first: Int

    """Only read the last \`n\` values of the set."""
    last: Int

    """
    Skip the first \`n\` values from our \`after\` cursor, an alternative to cursor
    based pagination. May not be used with \`last\`.
    """
    offset: Int

    """Read all values in the set before (above) this cursor."""
    before: Cursor

    """Read all values in the set after (below) this cursor."""
    after: Cursor

    """
    A condition to be used in determining which values should be returned by the collection.
    """
    condition: RepositoryCollaboratorCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: RepositoryCollaboratorFilter

    """The method to use when ordering \`RepositoryCollaborator\`."""
    orderBy: [RepositoryCollaboratorOrderBy!] = [PRIMARY_KEY_ASC]
  ): RepositoryCollaboratorConnection!

  """Reads and enables pagination through a set of \`ExternalDependency\`."""
  externalDependencies(
    """Only read the first \`n\` values of the set."""
    first: Int

    """Only read the last \`n\` values of the set."""
    last: Int

    """
    Skip the first \`n\` values from our \`after\` cursor, an alternative to cursor
    based pagination. May not be used with \`last\`.
    """
    offset: Int

    """Read all values in the set before (above) this cursor."""
    before: Cursor

    """Read all values in the set after (below) this cursor."""
    after: Cursor

    """
    A condition to be used in determining which values should be returned by the collection.
    """
    condition: ExternalDependencyCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: ExternalDependencyFilter

    """The method to use when ordering \`ExternalDependency\`."""
    orderBy: [ExternalDependencyOrderBy!] = [PRIMARY_KEY_ASC]
  ): ExternalDependencyConnection!

  """
  Reads and enables pagination through a set of \`RepositoryRelationship\`.
  """
  repositoryRelationshipsBySourceRepositoryId(
    """Only read the first \`n\` values of the set."""
    first: Int

    """Only read the last \`n\` values of the set."""
    last: Int

    """
    Skip the first \`n\` values from our \`after\` cursor, an alternative to cursor
    based pagination. May not be used with \`last\`.
    """
    offset: Int

    """Read all values in the set before (above) this cursor."""
    before: Cursor

    """Read all values in the set after (below) this cursor."""
    after: Cursor

    """
    A condition to be used in determining which values should be returned by the collection.
    """
    condition: RepositoryRelationshipCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: RepositoryRelationshipFilter

    """The method to use when ordering \`RepositoryRelationship\`."""
    orderBy: [RepositoryRelationshipOrderBy!] = [PRIMARY_KEY_ASC]
  ): RepositoryRelationshipConnection!

  """
  Reads and enables pagination through a set of \`RepositoryRelationship\`.
  """
  repositoryRelationshipsByTargetRepositoryId(
    """Only read the first \`n\` values of the set."""
    first: Int

    """Only read the last \`n\` values of the set."""
    last: Int

    """
    Skip the first \`n\` values from our \`after\` cursor, an alternative to cursor
    based pagination. May not be used with \`last\`.
    """
    offset: Int

    """Read all values in the set before (above) this cursor."""
    before: Cursor

    """Read all values in the set after (below) this cursor."""
    after: Cursor

    """
    A condition to be used in determining which values should be returned by the collection.
    """
    condition: RepositoryRelationshipCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: RepositoryRelationshipFilter

    """The method to use when ordering \`RepositoryRelationship\`."""
    orderBy: [RepositoryRelationshipOrderBy!] = [PRIMARY_KEY_ASC]
  ): RepositoryRelationshipConnection!

  """Reads and enables pagination through a set of \`PullRequest\`."""
  pullRequests(
    """Only read the first \`n\` values of the set."""
    first: Int

    """Only read the last \`n\` values of the set."""
    last: Int

    """
    Skip the first \`n\` values from our \`after\` cursor, an alternative to cursor
    based pagination. May not be used with \`last\`.
    """
    offset: Int

    """Read all values in the set before (above) this cursor."""
    before: Cursor

    """Read all values in the set after (below) this cursor."""
    after: Cursor

    """
    A condition to be used in determining which values should be returned by the collection.
    """
    condition: PullRequestCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: PullRequestFilter

    """The method to use when ordering \`PullRequest\`."""
    orderBy: [PullRequestOrderBy!] = [PRIMARY_KEY_ASC]
  ): PullRequestConnection!

  """Fetch a ref by its fully qualified name (e.g., "refs/heads/main")."""
  ref(qualifiedName: String!): Ref

  """List refs matching a prefix."""
  refs(
    """The ref prefix to filter by (e.g., "refs/heads/" for branches)."""
    refPrefix: String!

    """Maximum number of refs to return."""
    first: Int = 100
  ): RefConnection!

  """The default branch ref."""
  defaultBranchRef: Ref

  """Fetch a commit by its SHA."""
  commit(
    """The commit SHA."""
    sha: String!
  ): Commit
}

enum Visibility {
  public
  private
}

type User implements Node {
  """
  A globally unique identifier. Can be used in various places throughout the system to identify this single value.
  """
  id: ID!
  rowId: UUID!
  identityProviderId: UUID!
  name: String!
  avatarUrl: String
  email: String!
  createdAt: Datetime!
  updatedAt: Datetime!
  username: String!
  bio: String

  """Reads and enables pagination through a set of \`Repository\`."""
  repositoriesByOwnerId(
    """Only read the first \`n\` values of the set."""
    first: Int

    """Only read the last \`n\` values of the set."""
    last: Int

    """
    Skip the first \`n\` values from our \`after\` cursor, an alternative to cursor
    based pagination. May not be used with \`last\`.
    """
    offset: Int

    """Read all values in the set before (above) this cursor."""
    before: Cursor

    """Read all values in the set after (below) this cursor."""
    after: Cursor

    """
    A condition to be used in determining which values should be returned by the collection.
    """
    condition: RepositoryCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: RepositoryFilter

    """The method to use when ordering \`Repository\`."""
    orderBy: [RepositoryOrderBy!] = [PRIMARY_KEY_ASC]
  ): RepositoryConnection!

  """
  Reads and enables pagination through a set of \`RepositoryCollaborator\`.
  """
  repositoryCollaborators(
    """Only read the first \`n\` values of the set."""
    first: Int

    """Only read the last \`n\` values of the set."""
    last: Int

    """
    Skip the first \`n\` values from our \`after\` cursor, an alternative to cursor
    based pagination. May not be used with \`last\`.
    """
    offset: Int

    """Read all values in the set before (above) this cursor."""
    before: Cursor

    """Read all values in the set after (below) this cursor."""
    after: Cursor

    """
    A condition to be used in determining which values should be returned by the collection.
    """
    condition: RepositoryCollaboratorCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: RepositoryCollaboratorFilter

    """The method to use when ordering \`RepositoryCollaborator\`."""
    orderBy: [RepositoryCollaboratorOrderBy!] = [PRIMARY_KEY_ASC]
  ): RepositoryCollaboratorConnection!

  """Reads and enables pagination through a set of \`PullRequestComment\`."""
  authoredPullRequestComments(
    """Only read the first \`n\` values of the set."""
    first: Int

    """Only read the last \`n\` values of the set."""
    last: Int

    """
    Skip the first \`n\` values from our \`after\` cursor, an alternative to cursor
    based pagination. May not be used with \`last\`.
    """
    offset: Int

    """Read all values in the set before (above) this cursor."""
    before: Cursor

    """Read all values in the set after (below) this cursor."""
    after: Cursor

    """
    A condition to be used in determining which values should be returned by the collection.
    """
    condition: PullRequestCommentCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: PullRequestCommentFilter

    """The method to use when ordering \`PullRequestComment\`."""
    orderBy: [PullRequestCommentOrderBy!] = [PRIMARY_KEY_ASC]
  ): PullRequestCommentConnection!

  """Reads and enables pagination through a set of \`PullRequestReview\`."""
  reviewedPullRequestReviews(
    """Only read the first \`n\` values of the set."""
    first: Int

    """Only read the last \`n\` values of the set."""
    last: Int

    """
    Skip the first \`n\` values from our \`after\` cursor, an alternative to cursor
    based pagination. May not be used with \`last\`.
    """
    offset: Int

    """Read all values in the set before (above) this cursor."""
    before: Cursor

    """Read all values in the set after (below) this cursor."""
    after: Cursor

    """
    A condition to be used in determining which values should be returned by the collection.
    """
    condition: PullRequestReviewCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: PullRequestReviewFilter

    """The method to use when ordering \`PullRequestReview\`."""
    orderBy: [PullRequestReviewOrderBy!] = [PRIMARY_KEY_ASC]
  ): PullRequestReviewConnection!

  """Reads and enables pagination through a set of \`PullRequest\`."""
  authoredPullRequests(
    """Only read the first \`n\` values of the set."""
    first: Int

    """Only read the last \`n\` values of the set."""
    last: Int

    """
    Skip the first \`n\` values from our \`after\` cursor, an alternative to cursor
    based pagination. May not be used with \`last\`.
    """
    offset: Int

    """Read all values in the set before (above) this cursor."""
    before: Cursor

    """Read all values in the set after (below) this cursor."""
    after: Cursor

    """
    A condition to be used in determining which values should be returned by the collection.
    """
    condition: PullRequestCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: PullRequestFilter

    """The method to use when ordering \`PullRequest\`."""
    orderBy: [PullRequestOrderBy!] = [PRIMARY_KEY_ASC]
  ): PullRequestConnection!

  """Reads and enables pagination through a set of \`PullRequest\`."""
  pullRequestsByMergedById(
    """Only read the first \`n\` values of the set."""
    first: Int

    """Only read the last \`n\` values of the set."""
    last: Int

    """
    Skip the first \`n\` values from our \`after\` cursor, an alternative to cursor
    based pagination. May not be used with \`last\`.
    """
    offset: Int

    """Read all values in the set before (above) this cursor."""
    before: Cursor

    """Read all values in the set after (below) this cursor."""
    after: Cursor

    """
    A condition to be used in determining which values should be returned by the collection.
    """
    condition: PullRequestCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: PullRequestFilter

    """The method to use when ordering \`PullRequest\`."""
    orderBy: [PullRequestOrderBy!] = [PRIMARY_KEY_ASC]
  ): PullRequestConnection!
}

"""A location in a connection that can be used for resuming pagination."""
scalar Cursor

"""
A condition to be used against \`Repository\` object types. All fields are tested
for equality and combined with a logical ‘and.’
"""
input RepositoryCondition {
  """Checks for equality with the object’s \`rowId\` field."""
  rowId: UUID

  """Checks for equality with the object’s \`ownerId\` field."""
  ownerId: UUID

  """Checks for equality with the object’s \`organizationId\` field."""
  organizationId: UUID

  """Checks for equality with the object’s \`name\` field."""
  name: String

  """Checks for equality with the object’s \`slug\` field."""
  slug: String

  """Checks for equality with the object’s \`description\` field."""
  description: String

  """Checks for equality with the object’s \`visibility\` field."""
  visibility: Visibility

  """Checks for equality with the object’s \`defaultBranch\` field."""
  defaultBranch: String

  """Checks for equality with the object’s \`createdAt\` field."""
  createdAt: Datetime

  """Checks for equality with the object’s \`updatedAt\` field."""
  updatedAt: Datetime
}

"""
A filter to be used against \`Repository\` object types. All fields are combined with a logical ‘and.’
"""
input RepositoryFilter {
  """Filter by the object’s \`rowId\` field."""
  rowId: UUIDFilter

  """Filter by the object’s \`ownerId\` field."""
  ownerId: UUIDFilter

  """Filter by the object’s \`organizationId\` field."""
  organizationId: UUIDFilter

  """Filter by the object’s \`name\` field."""
  name: StringFilter

  """Filter by the object’s \`slug\` field."""
  slug: StringFilter

  """Filter by the object’s \`description\` field."""
  description: StringFilter

  """Filter by the object’s \`visibility\` field."""
  visibility: VisibilityFilter

  """Filter by the object’s \`defaultBranch\` field."""
  defaultBranch: StringFilter

  """Filter by the object’s \`createdAt\` field."""
  createdAt: DatetimeFilter

  """Filter by the object’s \`updatedAt\` field."""
  updatedAt: DatetimeFilter

  """Filter by the object’s \`repositoryCollaborators\` relation."""
  repositoryCollaborators: RepositoryToManyRepositoryCollaboratorFilter

  """Some related \`repositoryCollaborators\` exist."""
  repositoryCollaboratorsExist: Boolean

  """Filter by the object’s \`externalDependencies\` relation."""
  externalDependencies: RepositoryToManyExternalDependencyFilter

  """Some related \`externalDependencies\` exist."""
  externalDependenciesExist: Boolean

  """
  Filter by the object’s \`repositoryRelationshipsBySourceRepositoryId\` relation.
  """
  repositoryRelationshipsBySourceRepositoryId: RepositoryToManyRepositoryRelationshipFilter

  """Some related \`repositoryRelationshipsBySourceRepositoryId\` exist."""
  repositoryRelationshipsBySourceRepositoryIdExist: Boolean

  """
  Filter by the object’s \`repositoryRelationshipsByTargetRepositoryId\` relation.
  """
  repositoryRelationshipsByTargetRepositoryId: RepositoryToManyRepositoryRelationshipFilter

  """Some related \`repositoryRelationshipsByTargetRepositoryId\` exist."""
  repositoryRelationshipsByTargetRepositoryIdExist: Boolean

  """Filter by the object’s \`pullRequests\` relation."""
  pullRequests: RepositoryToManyPullRequestFilter

  """Some related \`pullRequests\` exist."""
  pullRequestsExist: Boolean

  """Filter by the object’s \`organization\` relation."""
  organization: OrganizationFilter

  """A related \`organization\` exists."""
  organizationExists: Boolean

  """Filter by the object’s \`owner\` relation."""
  owner: UserFilter

  """Checks for all expressions in this list."""
  and: [RepositoryFilter!]

  """Checks for any expressions in this list."""
  or: [RepositoryFilter!]

  """Negates the expression."""
  not: RepositoryFilter
}

"""
A filter to be used against UUID fields. All fields are combined with a logical ‘and.’
"""
input UUIDFilter {
  """
  Is null (if \`true\` is specified) or is not null (if \`false\` is specified).
  """
  isNull: Boolean

  """Equal to the specified value."""
  equalTo: UUID

  """Not equal to the specified value."""
  notEqualTo: UUID

  """
  Not equal to the specified value, treating null like an ordinary value.
  """
  distinctFrom: UUID

  """Equal to the specified value, treating null like an ordinary value."""
  notDistinctFrom: UUID

  """Included in the specified list."""
  in: [UUID!]

  """Not included in the specified list."""
  notIn: [UUID!]

  """Less than the specified value."""
  lessThan: UUID

  """Less than or equal to the specified value."""
  lessThanOrEqualTo: UUID

  """Greater than the specified value."""
  greaterThan: UUID

  """Greater than or equal to the specified value."""
  greaterThanOrEqualTo: UUID
}

"""
A filter to be used against String fields. All fields are combined with a logical ‘and.’
"""
input StringFilter {
  """
  Is null (if \`true\` is specified) or is not null (if \`false\` is specified).
  """
  isNull: Boolean

  """Equal to the specified value."""
  equalTo: String

  """Not equal to the specified value."""
  notEqualTo: String

  """
  Not equal to the specified value, treating null like an ordinary value.
  """
  distinctFrom: String

  """Equal to the specified value, treating null like an ordinary value."""
  notDistinctFrom: String

  """Included in the specified list."""
  in: [String!]

  """Not included in the specified list."""
  notIn: [String!]

  """Less than the specified value."""
  lessThan: String

  """Less than or equal to the specified value."""
  lessThanOrEqualTo: String

  """Greater than the specified value."""
  greaterThan: String

  """Greater than or equal to the specified value."""
  greaterThanOrEqualTo: String

  """Contains the specified string (case-sensitive)."""
  includes: String

  """Does not contain the specified string (case-sensitive)."""
  notIncludes: String

  """Contains the specified string (case-insensitive)."""
  includesInsensitive: String

  """Does not contain the specified string (case-insensitive)."""
  notIncludesInsensitive: String

  """Starts with the specified string (case-sensitive)."""
  startsWith: String

  """Does not start with the specified string (case-sensitive)."""
  notStartsWith: String

  """Starts with the specified string (case-insensitive)."""
  startsWithInsensitive: String

  """Does not start with the specified string (case-insensitive)."""
  notStartsWithInsensitive: String

  """Ends with the specified string (case-sensitive)."""
  endsWith: String

  """Does not end with the specified string (case-sensitive)."""
  notEndsWith: String

  """Ends with the specified string (case-insensitive)."""
  endsWithInsensitive: String

  """Does not end with the specified string (case-insensitive)."""
  notEndsWithInsensitive: String

  """
  Matches the specified pattern (case-sensitive). An underscore (_) matches any single character; a percent sign (%) matches any sequence of zero or more characters.
  """
  like: String

  """
  Does not match the specified pattern (case-sensitive). An underscore (_) matches any single character; a percent sign (%) matches any sequence of zero or more characters.
  """
  notLike: String

  """
  Matches the specified pattern (case-insensitive). An underscore (_) matches any single character; a percent sign (%) matches any sequence of zero or more characters.
  """
  likeInsensitive: String

  """
  Does not match the specified pattern (case-insensitive). An underscore (_) matches any single character; a percent sign (%) matches any sequence of zero or more characters.
  """
  notLikeInsensitive: String

  """Equal to the specified value (case-insensitive)."""
  equalToInsensitive: String

  """Not equal to the specified value (case-insensitive)."""
  notEqualToInsensitive: String

  """
  Not equal to the specified value, treating null like an ordinary value (case-insensitive).
  """
  distinctFromInsensitive: String

  """
  Equal to the specified value, treating null like an ordinary value (case-insensitive).
  """
  notDistinctFromInsensitive: String

  """Included in the specified list (case-insensitive)."""
  inInsensitive: [String!]

  """Not included in the specified list (case-insensitive)."""
  notInInsensitive: [String!]

  """Less than the specified value (case-insensitive)."""
  lessThanInsensitive: String

  """Less than or equal to the specified value (case-insensitive)."""
  lessThanOrEqualToInsensitive: String

  """Greater than the specified value (case-insensitive)."""
  greaterThanInsensitive: String

  """Greater than or equal to the specified value (case-insensitive)."""
  greaterThanOrEqualToInsensitive: String
}

"""
A filter to be used against Visibility fields. All fields are combined with a logical ‘and.’
"""
input VisibilityFilter {
  """
  Is null (if \`true\` is specified) or is not null (if \`false\` is specified).
  """
  isNull: Boolean

  """Equal to the specified value."""
  equalTo: Visibility

  """Not equal to the specified value."""
  notEqualTo: Visibility

  """
  Not equal to the specified value, treating null like an ordinary value.
  """
  distinctFrom: Visibility

  """Equal to the specified value, treating null like an ordinary value."""
  notDistinctFrom: Visibility

  """Included in the specified list."""
  in: [Visibility!]

  """Not included in the specified list."""
  notIn: [Visibility!]

  """Less than the specified value."""
  lessThan: Visibility

  """Less than or equal to the specified value."""
  lessThanOrEqualTo: Visibility

  """Greater than the specified value."""
  greaterThan: Visibility

  """Greater than or equal to the specified value."""
  greaterThanOrEqualTo: Visibility
}

"""
A filter to be used against Datetime fields. All fields are combined with a logical ‘and.’
"""
input DatetimeFilter {
  """
  Is null (if \`true\` is specified) or is not null (if \`false\` is specified).
  """
  isNull: Boolean

  """Equal to the specified value."""
  equalTo: Datetime

  """Not equal to the specified value."""
  notEqualTo: Datetime

  """
  Not equal to the specified value, treating null like an ordinary value.
  """
  distinctFrom: Datetime

  """Equal to the specified value, treating null like an ordinary value."""
  notDistinctFrom: Datetime

  """Included in the specified list."""
  in: [Datetime!]

  """Not included in the specified list."""
  notIn: [Datetime!]

  """Less than the specified value."""
  lessThan: Datetime

  """Less than or equal to the specified value."""
  lessThanOrEqualTo: Datetime

  """Greater than the specified value."""
  greaterThan: Datetime

  """Greater than or equal to the specified value."""
  greaterThanOrEqualTo: Datetime
}

"""
A filter to be used against many \`RepositoryCollaborator\` object types. All fields are combined with a logical ‘and.’
"""
input RepositoryToManyRepositoryCollaboratorFilter {
  """
  Every related \`RepositoryCollaborator\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  every: RepositoryCollaboratorFilter

  """
  Some related \`RepositoryCollaborator\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  some: RepositoryCollaboratorFilter

  """
  No related \`RepositoryCollaborator\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  none: RepositoryCollaboratorFilter

  """
  Aggregates across related \`RepositoryCollaborator\` match the filter criteria.
  """
  aggregates: RepositoryCollaboratorAggregatesFilter
}

"""
A filter to be used against \`RepositoryCollaborator\` object types. All fields are combined with a logical ‘and.’
"""
input RepositoryCollaboratorFilter {
  """Filter by the object’s \`repositoryId\` field."""
  repositoryId: UUIDFilter

  """Filter by the object’s \`userId\` field."""
  userId: UUIDFilter

  """Filter by the object’s \`permission\` field."""
  permission: PermissionFilter

  """Filter by the object’s \`createdAt\` field."""
  createdAt: DatetimeFilter

  """Filter by the object’s \`updatedAt\` field."""
  updatedAt: DatetimeFilter

  """Filter by the object’s \`repository\` relation."""
  repository: RepositoryFilter

  """Filter by the object’s \`user\` relation."""
  user: UserFilter

  """Checks for all expressions in this list."""
  and: [RepositoryCollaboratorFilter!]

  """Checks for any expressions in this list."""
  or: [RepositoryCollaboratorFilter!]

  """Negates the expression."""
  not: RepositoryCollaboratorFilter
}

"""
A filter to be used against Permission fields. All fields are combined with a logical ‘and.’
"""
input PermissionFilter {
  """
  Is null (if \`true\` is specified) or is not null (if \`false\` is specified).
  """
  isNull: Boolean

  """Equal to the specified value."""
  equalTo: Permission

  """Not equal to the specified value."""
  notEqualTo: Permission

  """
  Not equal to the specified value, treating null like an ordinary value.
  """
  distinctFrom: Permission

  """Equal to the specified value, treating null like an ordinary value."""
  notDistinctFrom: Permission

  """Included in the specified list."""
  in: [Permission!]

  """Not included in the specified list."""
  notIn: [Permission!]

  """Less than the specified value."""
  lessThan: Permission

  """Less than or equal to the specified value."""
  lessThanOrEqualTo: Permission

  """Greater than the specified value."""
  greaterThan: Permission

  """Greater than or equal to the specified value."""
  greaterThanOrEqualTo: Permission
}

enum Permission {
  read
  write
  admin
}

"""
A filter to be used against \`User\` object types. All fields are combined with a logical ‘and.’
"""
input UserFilter {
  """Filter by the object’s \`rowId\` field."""
  rowId: UUIDFilter

  """Filter by the object’s \`identityProviderId\` field."""
  identityProviderId: UUIDFilter

  """Filter by the object’s \`name\` field."""
  name: StringFilter

  """Filter by the object’s \`avatarUrl\` field."""
  avatarUrl: StringFilter

  """Filter by the object’s \`email\` field."""
  email: StringFilter

  """Filter by the object’s \`createdAt\` field."""
  createdAt: DatetimeFilter

  """Filter by the object’s \`updatedAt\` field."""
  updatedAt: DatetimeFilter

  """Filter by the object’s \`username\` field."""
  username: StringFilter

  """Filter by the object’s \`bio\` field."""
  bio: StringFilter

  """Filter by the object’s \`repositoriesByOwnerId\` relation."""
  repositoriesByOwnerId: UserToManyRepositoryFilter

  """Some related \`repositoriesByOwnerId\` exist."""
  repositoriesByOwnerIdExist: Boolean

  """Filter by the object’s \`repositoryCollaborators\` relation."""
  repositoryCollaborators: UserToManyRepositoryCollaboratorFilter

  """Some related \`repositoryCollaborators\` exist."""
  repositoryCollaboratorsExist: Boolean

  """Filter by the object’s \`authoredPullRequestComments\` relation."""
  authoredPullRequestComments: UserToManyPullRequestCommentFilter

  """Some related \`authoredPullRequestComments\` exist."""
  authoredPullRequestCommentsExist: Boolean

  """Filter by the object’s \`reviewedPullRequestReviews\` relation."""
  reviewedPullRequestReviews: UserToManyPullRequestReviewFilter

  """Some related \`reviewedPullRequestReviews\` exist."""
  reviewedPullRequestReviewsExist: Boolean

  """Filter by the object’s \`authoredPullRequests\` relation."""
  authoredPullRequests: UserToManyPullRequestFilter

  """Some related \`authoredPullRequests\` exist."""
  authoredPullRequestsExist: Boolean

  """Filter by the object’s \`pullRequestsByMergedById\` relation."""
  pullRequestsByMergedById: UserToManyPullRequestFilter

  """Some related \`pullRequestsByMergedById\` exist."""
  pullRequestsByMergedByIdExist: Boolean

  """Checks for all expressions in this list."""
  and: [UserFilter!]

  """Checks for any expressions in this list."""
  or: [UserFilter!]

  """Negates the expression."""
  not: UserFilter
}

"""
A filter to be used against many \`Repository\` object types. All fields are combined with a logical ‘and.’
"""
input UserToManyRepositoryFilter {
  """
  Every related \`Repository\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  every: RepositoryFilter

  """
  Some related \`Repository\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  some: RepositoryFilter

  """
  No related \`Repository\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  none: RepositoryFilter

  """Aggregates across related \`Repository\` match the filter criteria."""
  aggregates: RepositoryAggregatesFilter
}

"""A filter to be used against aggregates of \`Repository\` object types."""
input RepositoryAggregatesFilter {
  """
  A filter that must pass for the relevant \`Repository\` object to be included within the aggregate.
  """
  filter: RepositoryFilter

  """Distinct count aggregate over matching \`Repository\` objects."""
  distinctCount: RepositoryDistinctCountAggregateFilter
}

input RepositoryDistinctCountAggregateFilter {
  rowId: BigIntFilter
  ownerId: BigIntFilter
  organizationId: BigIntFilter
  name: BigIntFilter
  slug: BigIntFilter
  description: BigIntFilter
  visibility: BigIntFilter
  defaultBranch: BigIntFilter
  createdAt: BigIntFilter
  updatedAt: BigIntFilter
}

"""
A filter to be used against BigInt fields. All fields are combined with a logical ‘and.’
"""
input BigIntFilter {
  """
  Is null (if \`true\` is specified) or is not null (if \`false\` is specified).
  """
  isNull: Boolean

  """Equal to the specified value."""
  equalTo: BigInt

  """Not equal to the specified value."""
  notEqualTo: BigInt

  """
  Not equal to the specified value, treating null like an ordinary value.
  """
  distinctFrom: BigInt

  """Equal to the specified value, treating null like an ordinary value."""
  notDistinctFrom: BigInt

  """Included in the specified list."""
  in: [BigInt!]

  """Not included in the specified list."""
  notIn: [BigInt!]

  """Less than the specified value."""
  lessThan: BigInt

  """Less than or equal to the specified value."""
  lessThanOrEqualTo: BigInt

  """Greater than the specified value."""
  greaterThan: BigInt

  """Greater than or equal to the specified value."""
  greaterThanOrEqualTo: BigInt
}

"""
A signed eight-byte integer. The upper big integer values are greater than the
max value for a JavaScript number. Therefore all big integers will be output as
strings and not numbers.
"""
scalar BigInt

"""
A filter to be used against many \`RepositoryCollaborator\` object types. All fields are combined with a logical ‘and.’
"""
input UserToManyRepositoryCollaboratorFilter {
  """
  Every related \`RepositoryCollaborator\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  every: RepositoryCollaboratorFilter

  """
  Some related \`RepositoryCollaborator\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  some: RepositoryCollaboratorFilter

  """
  No related \`RepositoryCollaborator\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  none: RepositoryCollaboratorFilter

  """
  Aggregates across related \`RepositoryCollaborator\` match the filter criteria.
  """
  aggregates: RepositoryCollaboratorAggregatesFilter
}

"""
A filter to be used against aggregates of \`RepositoryCollaborator\` object types.
"""
input RepositoryCollaboratorAggregatesFilter {
  """
  A filter that must pass for the relevant \`RepositoryCollaborator\` object to be included within the aggregate.
  """
  filter: RepositoryCollaboratorFilter

  """
  Distinct count aggregate over matching \`RepositoryCollaborator\` objects.
  """
  distinctCount: RepositoryCollaboratorDistinctCountAggregateFilter
}

input RepositoryCollaboratorDistinctCountAggregateFilter {
  repositoryId: BigIntFilter
  userId: BigIntFilter
  permission: BigIntFilter
  createdAt: BigIntFilter
  updatedAt: BigIntFilter
}

"""
A filter to be used against many \`PullRequestComment\` object types. All fields are combined with a logical ‘and.’
"""
input UserToManyPullRequestCommentFilter {
  """
  Every related \`PullRequestComment\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  every: PullRequestCommentFilter

  """
  Some related \`PullRequestComment\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  some: PullRequestCommentFilter

  """
  No related \`PullRequestComment\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  none: PullRequestCommentFilter

  """
  Aggregates across related \`PullRequestComment\` match the filter criteria.
  """
  aggregates: PullRequestCommentAggregatesFilter
}

"""
A filter to be used against \`PullRequestComment\` object types. All fields are combined with a logical ‘and.’
"""
input PullRequestCommentFilter {
  """Filter by the object’s \`rowId\` field."""
  rowId: UUIDFilter

  """Filter by the object’s \`pullRequestId\` field."""
  pullRequestId: UUIDFilter

  """Filter by the object’s \`authorId\` field."""
  authorId: UUIDFilter

  """Filter by the object’s \`body\` field."""
  body: StringFilter

  """Filter by the object’s \`path\` field."""
  path: StringFilter

  """Filter by the object’s \`line\` field."""
  line: IntFilter

  """Filter by the object’s \`side\` field."""
  side: StringFilter

  """Filter by the object’s \`commitSha\` field."""
  commitSha: StringFilter

  """Filter by the object’s \`replyToId\` field."""
  replyToId: UUIDFilter

  """Filter by the object’s \`createdAt\` field."""
  createdAt: DatetimeFilter

  """Filter by the object’s \`updatedAt\` field."""
  updatedAt: DatetimeFilter

  """Filter by the object’s \`author\` relation."""
  author: UserFilter

  """Filter by the object’s \`pullRequest\` relation."""
  pullRequest: PullRequestFilter

  """Checks for all expressions in this list."""
  and: [PullRequestCommentFilter!]

  """Checks for any expressions in this list."""
  or: [PullRequestCommentFilter!]

  """Negates the expression."""
  not: PullRequestCommentFilter
}

"""
A filter to be used against Int fields. All fields are combined with a logical ‘and.’
"""
input IntFilter {
  """
  Is null (if \`true\` is specified) or is not null (if \`false\` is specified).
  """
  isNull: Boolean

  """Equal to the specified value."""
  equalTo: Int

  """Not equal to the specified value."""
  notEqualTo: Int

  """
  Not equal to the specified value, treating null like an ordinary value.
  """
  distinctFrom: Int

  """Equal to the specified value, treating null like an ordinary value."""
  notDistinctFrom: Int

  """Included in the specified list."""
  in: [Int!]

  """Not included in the specified list."""
  notIn: [Int!]

  """Less than the specified value."""
  lessThan: Int

  """Less than or equal to the specified value."""
  lessThanOrEqualTo: Int

  """Greater than the specified value."""
  greaterThan: Int

  """Greater than or equal to the specified value."""
  greaterThanOrEqualTo: Int
}

"""
A filter to be used against \`PullRequest\` object types. All fields are combined with a logical ‘and.’
"""
input PullRequestFilter {
  """Filter by the object’s \`rowId\` field."""
  rowId: UUIDFilter

  """Filter by the object’s \`number\` field."""
  number: IntFilter

  """Filter by the object’s \`repositoryId\` field."""
  repositoryId: UUIDFilter

  """Filter by the object’s \`authorId\` field."""
  authorId: UUIDFilter

  """Filter by the object’s \`title\` field."""
  title: StringFilter

  """Filter by the object’s \`description\` field."""
  description: StringFilter

  """Filter by the object’s \`state\` field."""
  state: StringFilter

  """Filter by the object’s \`sourceBranch\` field."""
  sourceBranch: StringFilter

  """Filter by the object’s \`targetBranch\` field."""
  targetBranch: StringFilter

  """Filter by the object’s \`mergeCommitSha\` field."""
  mergeCommitSha: StringFilter

  """Filter by the object’s \`mergedAt\` field."""
  mergedAt: DatetimeFilter

  """Filter by the object’s \`mergedById\` field."""
  mergedById: UUIDFilter

  """Filter by the object’s \`closedAt\` field."""
  closedAt: DatetimeFilter

  """Filter by the object’s \`createdAt\` field."""
  createdAt: DatetimeFilter

  """Filter by the object’s \`updatedAt\` field."""
  updatedAt: DatetimeFilter

  """Filter by the object’s \`pullRequestComments\` relation."""
  pullRequestComments: PullRequestToManyPullRequestCommentFilter

  """Some related \`pullRequestComments\` exist."""
  pullRequestCommentsExist: Boolean

  """Filter by the object’s \`pullRequestReviews\` relation."""
  pullRequestReviews: PullRequestToManyPullRequestReviewFilter

  """Some related \`pullRequestReviews\` exist."""
  pullRequestReviewsExist: Boolean

  """Filter by the object’s \`author\` relation."""
  author: UserFilter

  """Filter by the object’s \`mergedBy\` relation."""
  mergedBy: UserFilter

  """A related \`mergedBy\` exists."""
  mergedByExists: Boolean

  """Filter by the object’s \`repository\` relation."""
  repository: RepositoryFilter

  """Checks for all expressions in this list."""
  and: [PullRequestFilter!]

  """Checks for any expressions in this list."""
  or: [PullRequestFilter!]

  """Negates the expression."""
  not: PullRequestFilter
}

"""
A filter to be used against many \`PullRequestComment\` object types. All fields are combined with a logical ‘and.’
"""
input PullRequestToManyPullRequestCommentFilter {
  """
  Every related \`PullRequestComment\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  every: PullRequestCommentFilter

  """
  Some related \`PullRequestComment\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  some: PullRequestCommentFilter

  """
  No related \`PullRequestComment\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  none: PullRequestCommentFilter

  """
  Aggregates across related \`PullRequestComment\` match the filter criteria.
  """
  aggregates: PullRequestCommentAggregatesFilter
}

"""
A filter to be used against aggregates of \`PullRequestComment\` object types.
"""
input PullRequestCommentAggregatesFilter {
  """
  A filter that must pass for the relevant \`PullRequestComment\` object to be included within the aggregate.
  """
  filter: PullRequestCommentFilter

  """Sum aggregate over matching \`PullRequestComment\` objects."""
  sum: PullRequestCommentSumAggregateFilter

  """Distinct count aggregate over matching \`PullRequestComment\` objects."""
  distinctCount: PullRequestCommentDistinctCountAggregateFilter

  """Minimum aggregate over matching \`PullRequestComment\` objects."""
  min: PullRequestCommentMinAggregateFilter

  """Maximum aggregate over matching \`PullRequestComment\` objects."""
  max: PullRequestCommentMaxAggregateFilter

  """Mean average aggregate over matching \`PullRequestComment\` objects."""
  average: PullRequestCommentAverageAggregateFilter

  """
  Sample standard deviation aggregate over matching \`PullRequestComment\` objects.
  """
  stddevSample: PullRequestCommentStddevSampleAggregateFilter

  """
  Population standard deviation aggregate over matching \`PullRequestComment\` objects.
  """
  stddevPopulation: PullRequestCommentStddevPopulationAggregateFilter

  """Sample variance aggregate over matching \`PullRequestComment\` objects."""
  varianceSample: PullRequestCommentVarianceSampleAggregateFilter

  """
  Population variance aggregate over matching \`PullRequestComment\` objects.
  """
  variancePopulation: PullRequestCommentVariancePopulationAggregateFilter
}

input PullRequestCommentSumAggregateFilter {
  line: BigIntFilter
}

input PullRequestCommentDistinctCountAggregateFilter {
  rowId: BigIntFilter
  pullRequestId: BigIntFilter
  authorId: BigIntFilter
  body: BigIntFilter
  path: BigIntFilter
  line: BigIntFilter
  side: BigIntFilter
  commitSha: BigIntFilter
  replyToId: BigIntFilter
  createdAt: BigIntFilter
  updatedAt: BigIntFilter
}

input PullRequestCommentMinAggregateFilter {
  line: IntFilter
}

input PullRequestCommentMaxAggregateFilter {
  line: IntFilter
}

input PullRequestCommentAverageAggregateFilter {
  line: BigFloatFilter
}

"""
A filter to be used against BigFloat fields. All fields are combined with a logical ‘and.’
"""
input BigFloatFilter {
  """
  Is null (if \`true\` is specified) or is not null (if \`false\` is specified).
  """
  isNull: Boolean

  """Equal to the specified value."""
  equalTo: BigFloat

  """Not equal to the specified value."""
  notEqualTo: BigFloat

  """
  Not equal to the specified value, treating null like an ordinary value.
  """
  distinctFrom: BigFloat

  """Equal to the specified value, treating null like an ordinary value."""
  notDistinctFrom: BigFloat

  """Included in the specified list."""
  in: [BigFloat!]

  """Not included in the specified list."""
  notIn: [BigFloat!]

  """Less than the specified value."""
  lessThan: BigFloat

  """Less than or equal to the specified value."""
  lessThanOrEqualTo: BigFloat

  """Greater than the specified value."""
  greaterThan: BigFloat

  """Greater than or equal to the specified value."""
  greaterThanOrEqualTo: BigFloat
}

"""
A floating point number that requires more precision than IEEE 754 binary 64
"""
scalar BigFloat

input PullRequestCommentStddevSampleAggregateFilter {
  line: BigFloatFilter
}

input PullRequestCommentStddevPopulationAggregateFilter {
  line: BigFloatFilter
}

input PullRequestCommentVarianceSampleAggregateFilter {
  line: BigFloatFilter
}

input PullRequestCommentVariancePopulationAggregateFilter {
  line: BigFloatFilter
}

"""
A filter to be used against many \`PullRequestReview\` object types. All fields are combined with a logical ‘and.’
"""
input PullRequestToManyPullRequestReviewFilter {
  """
  Every related \`PullRequestReview\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  every: PullRequestReviewFilter

  """
  Some related \`PullRequestReview\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  some: PullRequestReviewFilter

  """
  No related \`PullRequestReview\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  none: PullRequestReviewFilter

  """
  Aggregates across related \`PullRequestReview\` match the filter criteria.
  """
  aggregates: PullRequestReviewAggregatesFilter
}

"""
A filter to be used against \`PullRequestReview\` object types. All fields are combined with a logical ‘and.’
"""
input PullRequestReviewFilter {
  """Filter by the object’s \`rowId\` field."""
  rowId: UUIDFilter

  """Filter by the object’s \`pullRequestId\` field."""
  pullRequestId: UUIDFilter

  """Filter by the object’s \`reviewerId\` field."""
  reviewerId: UUIDFilter

  """Filter by the object’s \`state\` field."""
  state: StringFilter

  """Filter by the object’s \`body\` field."""
  body: StringFilter

  """Filter by the object’s \`submittedAt\` field."""
  submittedAt: DatetimeFilter

  """Filter by the object’s \`createdAt\` field."""
  createdAt: DatetimeFilter

  """Filter by the object’s \`updatedAt\` field."""
  updatedAt: DatetimeFilter

  """Filter by the object’s \`pullRequest\` relation."""
  pullRequest: PullRequestFilter

  """Filter by the object’s \`reviewer\` relation."""
  reviewer: UserFilter

  """Checks for all expressions in this list."""
  and: [PullRequestReviewFilter!]

  """Checks for any expressions in this list."""
  or: [PullRequestReviewFilter!]

  """Negates the expression."""
  not: PullRequestReviewFilter
}

"""
A filter to be used against aggregates of \`PullRequestReview\` object types.
"""
input PullRequestReviewAggregatesFilter {
  """
  A filter that must pass for the relevant \`PullRequestReview\` object to be included within the aggregate.
  """
  filter: PullRequestReviewFilter

  """Distinct count aggregate over matching \`PullRequestReview\` objects."""
  distinctCount: PullRequestReviewDistinctCountAggregateFilter
}

input PullRequestReviewDistinctCountAggregateFilter {
  rowId: BigIntFilter
  pullRequestId: BigIntFilter
  reviewerId: BigIntFilter
  state: BigIntFilter
  body: BigIntFilter
  submittedAt: BigIntFilter
  createdAt: BigIntFilter
  updatedAt: BigIntFilter
}

"""
A filter to be used against many \`PullRequestReview\` object types. All fields are combined with a logical ‘and.’
"""
input UserToManyPullRequestReviewFilter {
  """
  Every related \`PullRequestReview\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  every: PullRequestReviewFilter

  """
  Some related \`PullRequestReview\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  some: PullRequestReviewFilter

  """
  No related \`PullRequestReview\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  none: PullRequestReviewFilter

  """
  Aggregates across related \`PullRequestReview\` match the filter criteria.
  """
  aggregates: PullRequestReviewAggregatesFilter
}

"""
A filter to be used against many \`PullRequest\` object types. All fields are combined with a logical ‘and.’
"""
input UserToManyPullRequestFilter {
  """
  Every related \`PullRequest\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  every: PullRequestFilter

  """
  Some related \`PullRequest\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  some: PullRequestFilter

  """
  No related \`PullRequest\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  none: PullRequestFilter

  """Aggregates across related \`PullRequest\` match the filter criteria."""
  aggregates: PullRequestAggregatesFilter
}

"""A filter to be used against aggregates of \`PullRequest\` object types."""
input PullRequestAggregatesFilter {
  """
  A filter that must pass for the relevant \`PullRequest\` object to be included within the aggregate.
  """
  filter: PullRequestFilter

  """Sum aggregate over matching \`PullRequest\` objects."""
  sum: PullRequestSumAggregateFilter

  """Distinct count aggregate over matching \`PullRequest\` objects."""
  distinctCount: PullRequestDistinctCountAggregateFilter

  """Minimum aggregate over matching \`PullRequest\` objects."""
  min: PullRequestMinAggregateFilter

  """Maximum aggregate over matching \`PullRequest\` objects."""
  max: PullRequestMaxAggregateFilter

  """Mean average aggregate over matching \`PullRequest\` objects."""
  average: PullRequestAverageAggregateFilter

  """
  Sample standard deviation aggregate over matching \`PullRequest\` objects.
  """
  stddevSample: PullRequestStddevSampleAggregateFilter

  """
  Population standard deviation aggregate over matching \`PullRequest\` objects.
  """
  stddevPopulation: PullRequestStddevPopulationAggregateFilter

  """Sample variance aggregate over matching \`PullRequest\` objects."""
  varianceSample: PullRequestVarianceSampleAggregateFilter

  """Population variance aggregate over matching \`PullRequest\` objects."""
  variancePopulation: PullRequestVariancePopulationAggregateFilter
}

input PullRequestSumAggregateFilter {
  number: BigIntFilter
}

input PullRequestDistinctCountAggregateFilter {
  rowId: BigIntFilter
  number: BigIntFilter
  repositoryId: BigIntFilter
  authorId: BigIntFilter
  title: BigIntFilter
  description: BigIntFilter
  state: BigIntFilter
  sourceBranch: BigIntFilter
  targetBranch: BigIntFilter
  mergeCommitSha: BigIntFilter
  mergedAt: BigIntFilter
  mergedById: BigIntFilter
  closedAt: BigIntFilter
  createdAt: BigIntFilter
  updatedAt: BigIntFilter
}

input PullRequestMinAggregateFilter {
  number: IntFilter
}

input PullRequestMaxAggregateFilter {
  number: IntFilter
}

input PullRequestAverageAggregateFilter {
  number: BigFloatFilter
}

input PullRequestStddevSampleAggregateFilter {
  number: BigFloatFilter
}

input PullRequestStddevPopulationAggregateFilter {
  number: BigFloatFilter
}

input PullRequestVarianceSampleAggregateFilter {
  number: BigFloatFilter
}

input PullRequestVariancePopulationAggregateFilter {
  number: BigFloatFilter
}

"""
A filter to be used against many \`ExternalDependency\` object types. All fields are combined with a logical ‘and.’
"""
input RepositoryToManyExternalDependencyFilter {
  """
  Every related \`ExternalDependency\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  every: ExternalDependencyFilter

  """
  Some related \`ExternalDependency\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  some: ExternalDependencyFilter

  """
  No related \`ExternalDependency\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  none: ExternalDependencyFilter

  """
  Aggregates across related \`ExternalDependency\` match the filter criteria.
  """
  aggregates: ExternalDependencyAggregatesFilter
}

"""
A filter to be used against \`ExternalDependency\` object types. All fields are combined with a logical ‘and.’
"""
input ExternalDependencyFilter {
  """Filter by the object’s \`rowId\` field."""
  rowId: UUIDFilter

  """Filter by the object’s \`repositoryId\` field."""
  repositoryId: UUIDFilter

  """Filter by the object’s \`packageManager\` field."""
  packageManager: StringFilter

  """Filter by the object’s \`packageName\` field."""
  packageName: StringFilter

  """Filter by the object’s \`versionConstraint\` field."""
  versionConstraint: StringFilter

  """Filter by the object’s \`detectionSource\` field."""
  detectionSource: StringFilter

  """Filter by the object’s \`createdAt\` field."""
  createdAt: DatetimeFilter

  """Filter by the object’s \`repository\` relation."""
  repository: RepositoryFilter

  """Checks for all expressions in this list."""
  and: [ExternalDependencyFilter!]

  """Checks for any expressions in this list."""
  or: [ExternalDependencyFilter!]

  """Negates the expression."""
  not: ExternalDependencyFilter
}

"""
A filter to be used against aggregates of \`ExternalDependency\` object types.
"""
input ExternalDependencyAggregatesFilter {
  """
  A filter that must pass for the relevant \`ExternalDependency\` object to be included within the aggregate.
  """
  filter: ExternalDependencyFilter

  """Distinct count aggregate over matching \`ExternalDependency\` objects."""
  distinctCount: ExternalDependencyDistinctCountAggregateFilter
}

input ExternalDependencyDistinctCountAggregateFilter {
  rowId: BigIntFilter
  repositoryId: BigIntFilter
  packageManager: BigIntFilter
  packageName: BigIntFilter
  versionConstraint: BigIntFilter
  detectionSource: BigIntFilter
  createdAt: BigIntFilter
}

"""
A filter to be used against many \`RepositoryRelationship\` object types. All fields are combined with a logical ‘and.’
"""
input RepositoryToManyRepositoryRelationshipFilter {
  """
  Every related \`RepositoryRelationship\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  every: RepositoryRelationshipFilter

  """
  Some related \`RepositoryRelationship\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  some: RepositoryRelationshipFilter

  """
  No related \`RepositoryRelationship\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  none: RepositoryRelationshipFilter

  """
  Aggregates across related \`RepositoryRelationship\` match the filter criteria.
  """
  aggregates: RepositoryRelationshipAggregatesFilter
}

"""
A filter to be used against \`RepositoryRelationship\` object types. All fields are combined with a logical ‘and.’
"""
input RepositoryRelationshipFilter {
  """Filter by the object’s \`rowId\` field."""
  rowId: UUIDFilter

  """Filter by the object’s \`sourceRepositoryId\` field."""
  sourceRepositoryId: UUIDFilter

  """Filter by the object’s \`targetRepositoryId\` field."""
  targetRepositoryId: UUIDFilter

  """Filter by the object’s \`relationshipTypeId\` field."""
  relationshipTypeId: UUIDFilter

  """Filter by the object’s \`detectionSource\` field."""
  detectionSource: StringFilter

  """Filter by the object’s \`confidence\` field."""
  confidence: FloatFilter

  """Filter by the object’s \`versionConstraint\` field."""
  versionConstraint: StringFilter

  """Filter by the object’s \`branch\` field."""
  branch: StringFilter

  """Filter by the object’s \`createdAt\` field."""
  createdAt: DatetimeFilter

  """Filter by the object’s \`updatedAt\` field."""
  updatedAt: DatetimeFilter

  """
  Filter by the object’s \`repositoryRelationshipMetadataByRelationshipId\` relation.
  """
  repositoryRelationshipMetadataByRelationshipId: RepositoryRelationshipToManyRepositoryRelationshipMetadatumFilter

  """Some related \`repositoryRelationshipMetadataByRelationshipId\` exist."""
  repositoryRelationshipMetadataByRelationshipIdExist: Boolean

  """Filter by the object’s \`relationshipType\` relation."""
  relationshipType: RepositoryRelationshipTypeFilter

  """Filter by the object’s \`sourceRepository\` relation."""
  sourceRepository: RepositoryFilter

  """Filter by the object’s \`targetRepository\` relation."""
  targetRepository: RepositoryFilter

  """Checks for all expressions in this list."""
  and: [RepositoryRelationshipFilter!]

  """Checks for any expressions in this list."""
  or: [RepositoryRelationshipFilter!]

  """Negates the expression."""
  not: RepositoryRelationshipFilter
}

"""
A filter to be used against Float fields. All fields are combined with a logical ‘and.’
"""
input FloatFilter {
  """
  Is null (if \`true\` is specified) or is not null (if \`false\` is specified).
  """
  isNull: Boolean

  """Equal to the specified value."""
  equalTo: Float

  """Not equal to the specified value."""
  notEqualTo: Float

  """
  Not equal to the specified value, treating null like an ordinary value.
  """
  distinctFrom: Float

  """Equal to the specified value, treating null like an ordinary value."""
  notDistinctFrom: Float

  """Included in the specified list."""
  in: [Float!]

  """Not included in the specified list."""
  notIn: [Float!]

  """Less than the specified value."""
  lessThan: Float

  """Less than or equal to the specified value."""
  lessThanOrEqualTo: Float

  """Greater than the specified value."""
  greaterThan: Float

  """Greater than or equal to the specified value."""
  greaterThanOrEqualTo: Float
}

"""
A filter to be used against many \`RepositoryRelationshipMetadatum\` object types. All fields are combined with a logical ‘and.’
"""
input RepositoryRelationshipToManyRepositoryRelationshipMetadatumFilter {
  """
  Every related \`RepositoryRelationshipMetadatum\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  every: RepositoryRelationshipMetadatumFilter

  """
  Some related \`RepositoryRelationshipMetadatum\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  some: RepositoryRelationshipMetadatumFilter

  """
  No related \`RepositoryRelationshipMetadatum\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  none: RepositoryRelationshipMetadatumFilter

  """
  Aggregates across related \`RepositoryRelationshipMetadatum\` match the filter criteria.
  """
  aggregates: RepositoryRelationshipMetadatumAggregatesFilter
}

"""
A filter to be used against \`RepositoryRelationshipMetadatum\` object types. All fields are combined with a logical ‘and.’
"""
input RepositoryRelationshipMetadatumFilter {
  """Filter by the object’s \`rowId\` field."""
  rowId: UUIDFilter

  """Filter by the object’s \`relationshipId\` field."""
  relationshipId: UUIDFilter

  """Filter by the object’s \`key\` field."""
  key: StringFilter

  """Filter by the object’s \`value\` field."""
  value: StringFilter

  """Filter by the object’s \`createdAt\` field."""
  createdAt: DatetimeFilter

  """Filter by the object’s \`relationship\` relation."""
  relationship: RepositoryRelationshipFilter

  """Checks for all expressions in this list."""
  and: [RepositoryRelationshipMetadatumFilter!]

  """Checks for any expressions in this list."""
  or: [RepositoryRelationshipMetadatumFilter!]

  """Negates the expression."""
  not: RepositoryRelationshipMetadatumFilter
}

"""
A filter to be used against aggregates of \`RepositoryRelationshipMetadatum\` object types.
"""
input RepositoryRelationshipMetadatumAggregatesFilter {
  """
  A filter that must pass for the relevant \`RepositoryRelationshipMetadatum\` object to be included within the aggregate.
  """
  filter: RepositoryRelationshipMetadatumFilter

  """
  Distinct count aggregate over matching \`RepositoryRelationshipMetadatum\` objects.
  """
  distinctCount: RepositoryRelationshipMetadatumDistinctCountAggregateFilter
}

input RepositoryRelationshipMetadatumDistinctCountAggregateFilter {
  rowId: BigIntFilter
  relationshipId: BigIntFilter
  key: BigIntFilter
  value: BigIntFilter
  createdAt: BigIntFilter
}

"""
A filter to be used against \`RepositoryRelationshipType\` object types. All fields are combined with a logical ‘and.’
"""
input RepositoryRelationshipTypeFilter {
  """Filter by the object’s \`rowId\` field."""
  rowId: UUIDFilter

  """Filter by the object’s \`name\` field."""
  name: StringFilter

  """Filter by the object’s \`description\` field."""
  description: StringFilter

  """Filter by the object’s \`isDirected\` field."""
  isDirected: BooleanFilter

  """Filter by the object’s \`organizationId\` field."""
  organizationId: UUIDFilter

  """Filter by the object’s \`createdAt\` field."""
  createdAt: DatetimeFilter

  """
  Filter by the object’s \`repositoryRelationshipsByRelationshipTypeId\` relation.
  """
  repositoryRelationshipsByRelationshipTypeId: RepositoryRelationshipTypeToManyRepositoryRelationshipFilter

  """Some related \`repositoryRelationshipsByRelationshipTypeId\` exist."""
  repositoryRelationshipsByRelationshipTypeIdExist: Boolean

  """Filter by the object’s \`organization\` relation."""
  organization: OrganizationFilter

  """A related \`organization\` exists."""
  organizationExists: Boolean

  """Checks for all expressions in this list."""
  and: [RepositoryRelationshipTypeFilter!]

  """Checks for any expressions in this list."""
  or: [RepositoryRelationshipTypeFilter!]

  """Negates the expression."""
  not: RepositoryRelationshipTypeFilter
}

"""
A filter to be used against Boolean fields. All fields are combined with a logical ‘and.’
"""
input BooleanFilter {
  """
  Is null (if \`true\` is specified) or is not null (if \`false\` is specified).
  """
  isNull: Boolean

  """Equal to the specified value."""
  equalTo: Boolean

  """Not equal to the specified value."""
  notEqualTo: Boolean

  """
  Not equal to the specified value, treating null like an ordinary value.
  """
  distinctFrom: Boolean

  """Equal to the specified value, treating null like an ordinary value."""
  notDistinctFrom: Boolean

  """Included in the specified list."""
  in: [Boolean!]

  """Not included in the specified list."""
  notIn: [Boolean!]

  """Less than the specified value."""
  lessThan: Boolean

  """Less than or equal to the specified value."""
  lessThanOrEqualTo: Boolean

  """Greater than the specified value."""
  greaterThan: Boolean

  """Greater than or equal to the specified value."""
  greaterThanOrEqualTo: Boolean
}

"""
A filter to be used against many \`RepositoryRelationship\` object types. All fields are combined with a logical ‘and.’
"""
input RepositoryRelationshipTypeToManyRepositoryRelationshipFilter {
  """
  Every related \`RepositoryRelationship\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  every: RepositoryRelationshipFilter

  """
  Some related \`RepositoryRelationship\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  some: RepositoryRelationshipFilter

  """
  No related \`RepositoryRelationship\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  none: RepositoryRelationshipFilter

  """
  Aggregates across related \`RepositoryRelationship\` match the filter criteria.
  """
  aggregates: RepositoryRelationshipAggregatesFilter
}

"""
A filter to be used against aggregates of \`RepositoryRelationship\` object types.
"""
input RepositoryRelationshipAggregatesFilter {
  """
  A filter that must pass for the relevant \`RepositoryRelationship\` object to be included within the aggregate.
  """
  filter: RepositoryRelationshipFilter

  """Sum aggregate over matching \`RepositoryRelationship\` objects."""
  sum: RepositoryRelationshipSumAggregateFilter

  """
  Distinct count aggregate over matching \`RepositoryRelationship\` objects.
  """
  distinctCount: RepositoryRelationshipDistinctCountAggregateFilter

  """Minimum aggregate over matching \`RepositoryRelationship\` objects."""
  min: RepositoryRelationshipMinAggregateFilter

  """Maximum aggregate over matching \`RepositoryRelationship\` objects."""
  max: RepositoryRelationshipMaxAggregateFilter

  """Mean average aggregate over matching \`RepositoryRelationship\` objects."""
  average: RepositoryRelationshipAverageAggregateFilter

  """
  Sample standard deviation aggregate over matching \`RepositoryRelationship\` objects.
  """
  stddevSample: RepositoryRelationshipStddevSampleAggregateFilter

  """
  Population standard deviation aggregate over matching \`RepositoryRelationship\` objects.
  """
  stddevPopulation: RepositoryRelationshipStddevPopulationAggregateFilter

  """
  Sample variance aggregate over matching \`RepositoryRelationship\` objects.
  """
  varianceSample: RepositoryRelationshipVarianceSampleAggregateFilter

  """
  Population variance aggregate over matching \`RepositoryRelationship\` objects.
  """
  variancePopulation: RepositoryRelationshipVariancePopulationAggregateFilter
}

input RepositoryRelationshipSumAggregateFilter {
  confidence: FloatFilter
}

input RepositoryRelationshipDistinctCountAggregateFilter {
  rowId: BigIntFilter
  sourceRepositoryId: BigIntFilter
  targetRepositoryId: BigIntFilter
  relationshipTypeId: BigIntFilter
  detectionSource: BigIntFilter
  confidence: BigIntFilter
  versionConstraint: BigIntFilter
  branch: BigIntFilter
  createdAt: BigIntFilter
  updatedAt: BigIntFilter
}

input RepositoryRelationshipMinAggregateFilter {
  confidence: FloatFilter
}

input RepositoryRelationshipMaxAggregateFilter {
  confidence: FloatFilter
}

input RepositoryRelationshipAverageAggregateFilter {
  confidence: FloatFilter
}

input RepositoryRelationshipStddevSampleAggregateFilter {
  confidence: FloatFilter
}

input RepositoryRelationshipStddevPopulationAggregateFilter {
  confidence: FloatFilter
}

input RepositoryRelationshipVarianceSampleAggregateFilter {
  confidence: FloatFilter
}

input RepositoryRelationshipVariancePopulationAggregateFilter {
  confidence: FloatFilter
}

"""
A filter to be used against \`Organization\` object types. All fields are combined with a logical ‘and.’
"""
input OrganizationFilter {
  """Filter by the object’s \`rowId\` field."""
  rowId: UUIDFilter

  """Filter by the object’s \`description\` field."""
  description: StringFilter

  """Filter by the object’s \`avatarUrl\` field."""
  avatarUrl: StringFilter

  """Filter by the object’s \`createdAt\` field."""
  createdAt: DatetimeFilter

  """Filter by the object’s \`updatedAt\` field."""
  updatedAt: DatetimeFilter

  """Filter by the object’s \`idpOrganizationId\` field."""
  idpOrganizationId: StringFilter

  """Filter by the object’s \`subscriptionId\` field."""
  subscriptionId: StringFilter

  """Filter by the object’s \`billingAccountId\` field."""
  billingAccountId: StringFilter

  """Filter by the object’s \`deletedAt\` field."""
  deletedAt: DatetimeFilter

  """Filter by the object’s \`deletionReason\` field."""
  deletionReason: StringFilter

  """Filter by the object’s \`repositories\` relation."""
  repositories: OrganizationToManyRepositoryFilter

  """Some related \`repositories\` exist."""
  repositoriesExist: Boolean

  """Filter by the object’s \`repositoryRelationshipTypes\` relation."""
  repositoryRelationshipTypes: OrganizationToManyRepositoryRelationshipTypeFilter

  """Some related \`repositoryRelationshipTypes\` exist."""
  repositoryRelationshipTypesExist: Boolean

  """Checks for all expressions in this list."""
  and: [OrganizationFilter!]

  """Checks for any expressions in this list."""
  or: [OrganizationFilter!]

  """Negates the expression."""
  not: OrganizationFilter
}

"""
A filter to be used against many \`Repository\` object types. All fields are combined with a logical ‘and.’
"""
input OrganizationToManyRepositoryFilter {
  """
  Every related \`Repository\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  every: RepositoryFilter

  """
  Some related \`Repository\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  some: RepositoryFilter

  """
  No related \`Repository\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  none: RepositoryFilter

  """Aggregates across related \`Repository\` match the filter criteria."""
  aggregates: RepositoryAggregatesFilter
}

"""
A filter to be used against many \`RepositoryRelationshipType\` object types. All fields are combined with a logical ‘and.’
"""
input OrganizationToManyRepositoryRelationshipTypeFilter {
  """
  Every related \`RepositoryRelationshipType\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  every: RepositoryRelationshipTypeFilter

  """
  Some related \`RepositoryRelationshipType\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  some: RepositoryRelationshipTypeFilter

  """
  No related \`RepositoryRelationshipType\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  none: RepositoryRelationshipTypeFilter

  """
  Aggregates across related \`RepositoryRelationshipType\` match the filter criteria.
  """
  aggregates: RepositoryRelationshipTypeAggregatesFilter
}

"""
A filter to be used against aggregates of \`RepositoryRelationshipType\` object types.
"""
input RepositoryRelationshipTypeAggregatesFilter {
  """
  A filter that must pass for the relevant \`RepositoryRelationshipType\` object to be included within the aggregate.
  """
  filter: RepositoryRelationshipTypeFilter

  """
  Distinct count aggregate over matching \`RepositoryRelationshipType\` objects.
  """
  distinctCount: RepositoryRelationshipTypeDistinctCountAggregateFilter
}

input RepositoryRelationshipTypeDistinctCountAggregateFilter {
  rowId: BigIntFilter
  name: BigIntFilter
  description: BigIntFilter
  isDirected: BigIntFilter
  organizationId: BigIntFilter
  createdAt: BigIntFilter
}

"""
A filter to be used against many \`PullRequest\` object types. All fields are combined with a logical ‘and.’
"""
input RepositoryToManyPullRequestFilter {
  """
  Every related \`PullRequest\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  every: PullRequestFilter

  """
  Some related \`PullRequest\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  some: PullRequestFilter

  """
  No related \`PullRequest\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  none: PullRequestFilter

  """Aggregates across related \`PullRequest\` match the filter criteria."""
  aggregates: PullRequestAggregatesFilter
}

"""Methods to use when ordering \`Repository\`."""
enum RepositoryOrderBy {
  NATURAL
  PRIMARY_KEY_ASC
  PRIMARY_KEY_DESC
  ROW_ID_ASC
  ROW_ID_DESC
  OWNER_ID_ASC
  OWNER_ID_DESC
  ORGANIZATION_ID_ASC
  ORGANIZATION_ID_DESC
  NAME_ASC
  NAME_DESC
  SLUG_ASC
  SLUG_DESC
  DESCRIPTION_ASC
  DESCRIPTION_DESC
  VISIBILITY_ASC
  VISIBILITY_DESC
  DEFAULT_BRANCH_ASC
  DEFAULT_BRANCH_DESC
  CREATED_AT_ASC
  CREATED_AT_DESC
  UPDATED_AT_ASC
  UPDATED_AT_DESC
  REPOSITORY_COLLABORATORS_COUNT_ASC
  REPOSITORY_COLLABORATORS_COUNT_DESC
  REPOSITORY_COLLABORATORS_DISTINCT_COUNT_REPOSITORY_ID_ASC
  REPOSITORY_COLLABORATORS_DISTINCT_COUNT_REPOSITORY_ID_DESC
  REPOSITORY_COLLABORATORS_DISTINCT_COUNT_USER_ID_ASC
  REPOSITORY_COLLABORATORS_DISTINCT_COUNT_USER_ID_DESC
  REPOSITORY_COLLABORATORS_DISTINCT_COUNT_PERMISSION_ASC
  REPOSITORY_COLLABORATORS_DISTINCT_COUNT_PERMISSION_DESC
  REPOSITORY_COLLABORATORS_DISTINCT_COUNT_CREATED_AT_ASC
  REPOSITORY_COLLABORATORS_DISTINCT_COUNT_CREATED_AT_DESC
  REPOSITORY_COLLABORATORS_DISTINCT_COUNT_UPDATED_AT_ASC
  REPOSITORY_COLLABORATORS_DISTINCT_COUNT_UPDATED_AT_DESC
  EXTERNAL_DEPENDENCIES_COUNT_ASC
  EXTERNAL_DEPENDENCIES_COUNT_DESC
  EXTERNAL_DEPENDENCIES_DISTINCT_COUNT_ROW_ID_ASC
  EXTERNAL_DEPENDENCIES_DISTINCT_COUNT_ROW_ID_DESC
  EXTERNAL_DEPENDENCIES_DISTINCT_COUNT_REPOSITORY_ID_ASC
  EXTERNAL_DEPENDENCIES_DISTINCT_COUNT_REPOSITORY_ID_DESC
  EXTERNAL_DEPENDENCIES_DISTINCT_COUNT_PACKAGE_MANAGER_ASC
  EXTERNAL_DEPENDENCIES_DISTINCT_COUNT_PACKAGE_MANAGER_DESC
  EXTERNAL_DEPENDENCIES_DISTINCT_COUNT_PACKAGE_NAME_ASC
  EXTERNAL_DEPENDENCIES_DISTINCT_COUNT_PACKAGE_NAME_DESC
  EXTERNAL_DEPENDENCIES_DISTINCT_COUNT_VERSION_CONSTRAINT_ASC
  EXTERNAL_DEPENDENCIES_DISTINCT_COUNT_VERSION_CONSTRAINT_DESC
  EXTERNAL_DEPENDENCIES_DISTINCT_COUNT_DETECTION_SOURCE_ASC
  EXTERNAL_DEPENDENCIES_DISTINCT_COUNT_DETECTION_SOURCE_DESC
  EXTERNAL_DEPENDENCIES_DISTINCT_COUNT_CREATED_AT_ASC
  EXTERNAL_DEPENDENCIES_DISTINCT_COUNT_CREATED_AT_DESC
  REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_COUNT_ASC
  REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_COUNT_DESC
  REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_SUM_CONFIDENCE_ASC
  REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_SUM_CONFIDENCE_DESC
  REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_DISTINCT_COUNT_ROW_ID_ASC
  REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_DISTINCT_COUNT_ROW_ID_DESC
  REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_DISTINCT_COUNT_SOURCE_REPOSITORY_ID_ASC
  REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_DISTINCT_COUNT_SOURCE_REPOSITORY_ID_DESC
  REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_DISTINCT_COUNT_TARGET_REPOSITORY_ID_ASC
  REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_DISTINCT_COUNT_TARGET_REPOSITORY_ID_DESC
  REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_DISTINCT_COUNT_RELATIONSHIP_TYPE_ID_ASC
  REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_DISTINCT_COUNT_RELATIONSHIP_TYPE_ID_DESC
  REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_DISTINCT_COUNT_DETECTION_SOURCE_ASC
  REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_DISTINCT_COUNT_DETECTION_SOURCE_DESC
  REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_DISTINCT_COUNT_CONFIDENCE_ASC
  REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_DISTINCT_COUNT_CONFIDENCE_DESC
  REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_DISTINCT_COUNT_VERSION_CONSTRAINT_ASC
  REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_DISTINCT_COUNT_VERSION_CONSTRAINT_DESC
  REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_DISTINCT_COUNT_BRANCH_ASC
  REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_DISTINCT_COUNT_BRANCH_DESC
  REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_DISTINCT_COUNT_CREATED_AT_ASC
  REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_DISTINCT_COUNT_CREATED_AT_DESC
  REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_DISTINCT_COUNT_UPDATED_AT_ASC
  REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_DISTINCT_COUNT_UPDATED_AT_DESC
  REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_MIN_CONFIDENCE_ASC
  REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_MIN_CONFIDENCE_DESC
  REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_MAX_CONFIDENCE_ASC
  REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_MAX_CONFIDENCE_DESC
  REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_AVERAGE_CONFIDENCE_ASC
  REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_AVERAGE_CONFIDENCE_DESC
  REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_STDDEV_SAMPLE_CONFIDENCE_ASC
  REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_STDDEV_SAMPLE_CONFIDENCE_DESC
  REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_STDDEV_POPULATION_CONFIDENCE_ASC
  REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_STDDEV_POPULATION_CONFIDENCE_DESC
  REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_VARIANCE_SAMPLE_CONFIDENCE_ASC
  REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_VARIANCE_SAMPLE_CONFIDENCE_DESC
  REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_VARIANCE_POPULATION_CONFIDENCE_ASC
  REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_VARIANCE_POPULATION_CONFIDENCE_DESC
  REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_COUNT_ASC
  REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_COUNT_DESC
  REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_SUM_CONFIDENCE_ASC
  REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_SUM_CONFIDENCE_DESC
  REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_DISTINCT_COUNT_ROW_ID_ASC
  REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_DISTINCT_COUNT_ROW_ID_DESC
  REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_DISTINCT_COUNT_SOURCE_REPOSITORY_ID_ASC
  REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_DISTINCT_COUNT_SOURCE_REPOSITORY_ID_DESC
  REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_DISTINCT_COUNT_TARGET_REPOSITORY_ID_ASC
  REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_DISTINCT_COUNT_TARGET_REPOSITORY_ID_DESC
  REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_DISTINCT_COUNT_RELATIONSHIP_TYPE_ID_ASC
  REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_DISTINCT_COUNT_RELATIONSHIP_TYPE_ID_DESC
  REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_DISTINCT_COUNT_DETECTION_SOURCE_ASC
  REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_DISTINCT_COUNT_DETECTION_SOURCE_DESC
  REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_DISTINCT_COUNT_CONFIDENCE_ASC
  REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_DISTINCT_COUNT_CONFIDENCE_DESC
  REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_DISTINCT_COUNT_VERSION_CONSTRAINT_ASC
  REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_DISTINCT_COUNT_VERSION_CONSTRAINT_DESC
  REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_DISTINCT_COUNT_BRANCH_ASC
  REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_DISTINCT_COUNT_BRANCH_DESC
  REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_DISTINCT_COUNT_CREATED_AT_ASC
  REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_DISTINCT_COUNT_CREATED_AT_DESC
  REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_DISTINCT_COUNT_UPDATED_AT_ASC
  REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_DISTINCT_COUNT_UPDATED_AT_DESC
  REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_MIN_CONFIDENCE_ASC
  REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_MIN_CONFIDENCE_DESC
  REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_MAX_CONFIDENCE_ASC
  REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_MAX_CONFIDENCE_DESC
  REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_AVERAGE_CONFIDENCE_ASC
  REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_AVERAGE_CONFIDENCE_DESC
  REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_STDDEV_SAMPLE_CONFIDENCE_ASC
  REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_STDDEV_SAMPLE_CONFIDENCE_DESC
  REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_STDDEV_POPULATION_CONFIDENCE_ASC
  REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_STDDEV_POPULATION_CONFIDENCE_DESC
  REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_VARIANCE_SAMPLE_CONFIDENCE_ASC
  REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_VARIANCE_SAMPLE_CONFIDENCE_DESC
  REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_VARIANCE_POPULATION_CONFIDENCE_ASC
  REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_VARIANCE_POPULATION_CONFIDENCE_DESC
  PULL_REQUESTS_COUNT_ASC
  PULL_REQUESTS_COUNT_DESC
  PULL_REQUESTS_SUM_NUMBER_ASC
  PULL_REQUESTS_SUM_NUMBER_DESC
  PULL_REQUESTS_DISTINCT_COUNT_ROW_ID_ASC
  PULL_REQUESTS_DISTINCT_COUNT_ROW_ID_DESC
  PULL_REQUESTS_DISTINCT_COUNT_NUMBER_ASC
  PULL_REQUESTS_DISTINCT_COUNT_NUMBER_DESC
  PULL_REQUESTS_DISTINCT_COUNT_REPOSITORY_ID_ASC
  PULL_REQUESTS_DISTINCT_COUNT_REPOSITORY_ID_DESC
  PULL_REQUESTS_DISTINCT_COUNT_AUTHOR_ID_ASC
  PULL_REQUESTS_DISTINCT_COUNT_AUTHOR_ID_DESC
  PULL_REQUESTS_DISTINCT_COUNT_TITLE_ASC
  PULL_REQUESTS_DISTINCT_COUNT_TITLE_DESC
  PULL_REQUESTS_DISTINCT_COUNT_DESCRIPTION_ASC
  PULL_REQUESTS_DISTINCT_COUNT_DESCRIPTION_DESC
  PULL_REQUESTS_DISTINCT_COUNT_STATE_ASC
  PULL_REQUESTS_DISTINCT_COUNT_STATE_DESC
  PULL_REQUESTS_DISTINCT_COUNT_SOURCE_BRANCH_ASC
  PULL_REQUESTS_DISTINCT_COUNT_SOURCE_BRANCH_DESC
  PULL_REQUESTS_DISTINCT_COUNT_TARGET_BRANCH_ASC
  PULL_REQUESTS_DISTINCT_COUNT_TARGET_BRANCH_DESC
  PULL_REQUESTS_DISTINCT_COUNT_MERGE_COMMIT_SHA_ASC
  PULL_REQUESTS_DISTINCT_COUNT_MERGE_COMMIT_SHA_DESC
  PULL_REQUESTS_DISTINCT_COUNT_MERGED_AT_ASC
  PULL_REQUESTS_DISTINCT_COUNT_MERGED_AT_DESC
  PULL_REQUESTS_DISTINCT_COUNT_MERGED_BY_ID_ASC
  PULL_REQUESTS_DISTINCT_COUNT_MERGED_BY_ID_DESC
  PULL_REQUESTS_DISTINCT_COUNT_CLOSED_AT_ASC
  PULL_REQUESTS_DISTINCT_COUNT_CLOSED_AT_DESC
  PULL_REQUESTS_DISTINCT_COUNT_CREATED_AT_ASC
  PULL_REQUESTS_DISTINCT_COUNT_CREATED_AT_DESC
  PULL_REQUESTS_DISTINCT_COUNT_UPDATED_AT_ASC
  PULL_REQUESTS_DISTINCT_COUNT_UPDATED_AT_DESC
  PULL_REQUESTS_MIN_NUMBER_ASC
  PULL_REQUESTS_MIN_NUMBER_DESC
  PULL_REQUESTS_MAX_NUMBER_ASC
  PULL_REQUESTS_MAX_NUMBER_DESC
  PULL_REQUESTS_AVERAGE_NUMBER_ASC
  PULL_REQUESTS_AVERAGE_NUMBER_DESC
  PULL_REQUESTS_STDDEV_SAMPLE_NUMBER_ASC
  PULL_REQUESTS_STDDEV_SAMPLE_NUMBER_DESC
  PULL_REQUESTS_STDDEV_POPULATION_NUMBER_ASC
  PULL_REQUESTS_STDDEV_POPULATION_NUMBER_DESC
  PULL_REQUESTS_VARIANCE_SAMPLE_NUMBER_ASC
  PULL_REQUESTS_VARIANCE_SAMPLE_NUMBER_DESC
  PULL_REQUESTS_VARIANCE_POPULATION_NUMBER_ASC
  PULL_REQUESTS_VARIANCE_POPULATION_NUMBER_DESC
}

"""A connection to a list of \`RepositoryCollaborator\` values."""
type RepositoryCollaboratorConnection {
  """A list of \`RepositoryCollaborator\` objects."""
  nodes: [RepositoryCollaborator!]!

  """
  A list of edges which contains the \`RepositoryCollaborator\` and cursor to aid in pagination.
  """
  edges: [RepositoryCollaboratorEdge!]!

  """Information to aid in pagination."""
  pageInfo: PageInfo!

  """
  The count of *all* \`RepositoryCollaborator\` you could get from the connection.
  """
  totalCount: Int!

  """
  Aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  aggregates: RepositoryCollaboratorAggregates

  """
  Grouped aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  groupedAggregates(
    """
    The method to use when grouping \`RepositoryCollaborator\` for these aggregates.
    """
    groupBy: [RepositoryCollaboratorGroupBy!]!

    """Conditions on the grouped aggregates."""
    having: RepositoryCollaboratorHavingInput
  ): [RepositoryCollaboratorAggregates!]
}

type RepositoryCollaborator implements Node {
  """
  A globally unique identifier. Can be used in various places throughout the system to identify this single value.
  """
  id: ID!
  repositoryId: UUID!
  userId: UUID!
  permission: Permission!
  createdAt: Datetime!
  updatedAt: Datetime!

  """
  Reads a single \`Repository\` that is related to this \`RepositoryCollaborator\`.
  """
  repository: Repository

  """
  Reads a single \`User\` that is related to this \`RepositoryCollaborator\`.
  """
  user: User
}

"""A \`RepositoryCollaborator\` edge in the connection."""
type RepositoryCollaboratorEdge {
  """A cursor for use in pagination."""
  cursor: Cursor

  """The \`RepositoryCollaborator\` at the end of the edge."""
  node: RepositoryCollaborator!
}

"""Information about pagination in a connection."""
type PageInfo {
  """When paginating forwards, are there more items?"""
  hasNextPage: Boolean!

  """When paginating backwards, are there more items?"""
  hasPreviousPage: Boolean!

  """When paginating backwards, the cursor to continue."""
  startCursor: Cursor

  """When paginating forwards, the cursor to continue."""
  endCursor: Cursor
}

type RepositoryCollaboratorAggregates {
  keys: [String]

  """
  Distinct count aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  distinctCount: RepositoryCollaboratorDistinctCountAggregates
}

type RepositoryCollaboratorDistinctCountAggregates {
  """Distinct count of repositoryId across the matching connection"""
  repositoryId: BigInt

  """Distinct count of userId across the matching connection"""
  userId: BigInt

  """Distinct count of permission across the matching connection"""
  permission: BigInt

  """Distinct count of createdAt across the matching connection"""
  createdAt: BigInt

  """Distinct count of updatedAt across the matching connection"""
  updatedAt: BigInt
}

"""
Grouping methods for \`RepositoryCollaborator\` for usage during aggregation.
"""
enum RepositoryCollaboratorGroupBy {
  REPOSITORY_ID
  USER_ID
  PERMISSION
  CREATED_AT
  CREATED_AT_TRUNCATED_TO_HOUR
  CREATED_AT_TRUNCATED_TO_DAY
  UPDATED_AT
  UPDATED_AT_TRUNCATED_TO_HOUR
  UPDATED_AT_TRUNCATED_TO_DAY
}

"""Conditions for \`RepositoryCollaborator\` aggregates."""
input RepositoryCollaboratorHavingInput {
  AND: [RepositoryCollaboratorHavingInput!]
  OR: [RepositoryCollaboratorHavingInput!]
  sum: RepositoryCollaboratorHavingSumInput
  distinctCount: RepositoryCollaboratorHavingDistinctCountInput
  min: RepositoryCollaboratorHavingMinInput
  max: RepositoryCollaboratorHavingMaxInput
  average: RepositoryCollaboratorHavingAverageInput
  stddevSample: RepositoryCollaboratorHavingStddevSampleInput
  stddevPopulation: RepositoryCollaboratorHavingStddevPopulationInput
  varianceSample: RepositoryCollaboratorHavingVarianceSampleInput
  variancePopulation: RepositoryCollaboratorHavingVariancePopulationInput
}

input RepositoryCollaboratorHavingSumInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input HavingDatetimeFilter {
  equalTo: Datetime
  notEqualTo: Datetime
  greaterThan: Datetime
  greaterThanOrEqualTo: Datetime
  lessThan: Datetime
  lessThanOrEqualTo: Datetime
}

input RepositoryCollaboratorHavingDistinctCountInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input RepositoryCollaboratorHavingMinInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input RepositoryCollaboratorHavingMaxInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input RepositoryCollaboratorHavingAverageInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input RepositoryCollaboratorHavingStddevSampleInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input RepositoryCollaboratorHavingStddevPopulationInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input RepositoryCollaboratorHavingVarianceSampleInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input RepositoryCollaboratorHavingVariancePopulationInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

"""
A condition to be used against \`RepositoryCollaborator\` object types. All fields
are tested for equality and combined with a logical ‘and.’
"""
input RepositoryCollaboratorCondition {
  """Checks for equality with the object’s \`repositoryId\` field."""
  repositoryId: UUID

  """Checks for equality with the object’s \`userId\` field."""
  userId: UUID

  """Checks for equality with the object’s \`permission\` field."""
  permission: Permission

  """Checks for equality with the object’s \`createdAt\` field."""
  createdAt: Datetime

  """Checks for equality with the object’s \`updatedAt\` field."""
  updatedAt: Datetime
}

"""Methods to use when ordering \`RepositoryCollaborator\`."""
enum RepositoryCollaboratorOrderBy {
  NATURAL
  PRIMARY_KEY_ASC
  PRIMARY_KEY_DESC
  REPOSITORY_ID_ASC
  REPOSITORY_ID_DESC
  USER_ID_ASC
  USER_ID_DESC
  PERMISSION_ASC
  PERMISSION_DESC
  CREATED_AT_ASC
  CREATED_AT_DESC
  UPDATED_AT_ASC
  UPDATED_AT_DESC
}

"""A connection to a list of \`PullRequestComment\` values."""
type PullRequestCommentConnection {
  """A list of \`PullRequestComment\` objects."""
  nodes: [PullRequestComment!]!

  """
  A list of edges which contains the \`PullRequestComment\` and cursor to aid in pagination.
  """
  edges: [PullRequestCommentEdge!]!

  """Information to aid in pagination."""
  pageInfo: PageInfo!

  """
  The count of *all* \`PullRequestComment\` you could get from the connection.
  """
  totalCount: Int!

  """
  Aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  aggregates: PullRequestCommentAggregates

  """
  Grouped aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  groupedAggregates(
    """
    The method to use when grouping \`PullRequestComment\` for these aggregates.
    """
    groupBy: [PullRequestCommentGroupBy!]!

    """Conditions on the grouped aggregates."""
    having: PullRequestCommentHavingInput
  ): [PullRequestCommentAggregates!]
}

type PullRequestComment implements Node {
  """
  A globally unique identifier. Can be used in various places throughout the system to identify this single value.
  """
  id: ID!
  rowId: UUID!
  pullRequestId: UUID!
  authorId: UUID!
  body: String!
  path: String
  line: Int
  side: String
  commitSha: String
  replyToId: UUID
  createdAt: Datetime!
  updatedAt: Datetime!

  """Reads a single \`User\` that is related to this \`PullRequestComment\`."""
  author: User

  """
  Reads a single \`PullRequest\` that is related to this \`PullRequestComment\`.
  """
  pullRequest: PullRequest
}

type PullRequest implements Node {
  """
  A globally unique identifier. Can be used in various places throughout the system to identify this single value.
  """
  id: ID!
  rowId: UUID!
  number: Int!
  repositoryId: UUID!
  authorId: UUID!
  title: String!
  description: String
  state: String!
  sourceBranch: String!
  targetBranch: String!
  mergeCommitSha: String
  mergedAt: Datetime
  mergedById: UUID
  closedAt: Datetime
  createdAt: Datetime!
  updatedAt: Datetime!

  """Reads a single \`User\` that is related to this \`PullRequest\`."""
  author: User

  """Reads a single \`User\` that is related to this \`PullRequest\`."""
  mergedBy: User

  """Reads a single \`Repository\` that is related to this \`PullRequest\`."""
  repository: Repository

  """Reads and enables pagination through a set of \`PullRequestComment\`."""
  pullRequestComments(
    """Only read the first \`n\` values of the set."""
    first: Int

    """Only read the last \`n\` values of the set."""
    last: Int

    """
    Skip the first \`n\` values from our \`after\` cursor, an alternative to cursor
    based pagination. May not be used with \`last\`.
    """
    offset: Int

    """Read all values in the set before (above) this cursor."""
    before: Cursor

    """Read all values in the set after (below) this cursor."""
    after: Cursor

    """
    A condition to be used in determining which values should be returned by the collection.
    """
    condition: PullRequestCommentCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: PullRequestCommentFilter

    """The method to use when ordering \`PullRequestComment\`."""
    orderBy: [PullRequestCommentOrderBy!] = [PRIMARY_KEY_ASC]
  ): PullRequestCommentConnection!

  """Reads and enables pagination through a set of \`PullRequestReview\`."""
  pullRequestReviews(
    """Only read the first \`n\` values of the set."""
    first: Int

    """Only read the last \`n\` values of the set."""
    last: Int

    """
    Skip the first \`n\` values from our \`after\` cursor, an alternative to cursor
    based pagination. May not be used with \`last\`.
    """
    offset: Int

    """Read all values in the set before (above) this cursor."""
    before: Cursor

    """Read all values in the set after (below) this cursor."""
    after: Cursor

    """
    A condition to be used in determining which values should be returned by the collection.
    """
    condition: PullRequestReviewCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: PullRequestReviewFilter

    """The method to use when ordering \`PullRequestReview\`."""
    orderBy: [PullRequestReviewOrderBy!] = [PRIMARY_KEY_ASC]
  ): PullRequestReviewConnection!
}

"""
A condition to be used against \`PullRequestComment\` object types. All fields are
tested for equality and combined with a logical ‘and.’
"""
input PullRequestCommentCondition {
  """Checks for equality with the object’s \`rowId\` field."""
  rowId: UUID

  """Checks for equality with the object’s \`pullRequestId\` field."""
  pullRequestId: UUID

  """Checks for equality with the object’s \`authorId\` field."""
  authorId: UUID

  """Checks for equality with the object’s \`body\` field."""
  body: String

  """Checks for equality with the object’s \`path\` field."""
  path: String

  """Checks for equality with the object’s \`line\` field."""
  line: Int

  """Checks for equality with the object’s \`side\` field."""
  side: String

  """Checks for equality with the object’s \`commitSha\` field."""
  commitSha: String

  """Checks for equality with the object’s \`replyToId\` field."""
  replyToId: UUID

  """Checks for equality with the object’s \`createdAt\` field."""
  createdAt: Datetime

  """Checks for equality with the object’s \`updatedAt\` field."""
  updatedAt: Datetime
}

"""Methods to use when ordering \`PullRequestComment\`."""
enum PullRequestCommentOrderBy {
  NATURAL
  PRIMARY_KEY_ASC
  PRIMARY_KEY_DESC
  ROW_ID_ASC
  ROW_ID_DESC
  PULL_REQUEST_ID_ASC
  PULL_REQUEST_ID_DESC
  AUTHOR_ID_ASC
  AUTHOR_ID_DESC
  BODY_ASC
  BODY_DESC
  PATH_ASC
  PATH_DESC
  LINE_ASC
  LINE_DESC
  SIDE_ASC
  SIDE_DESC
  COMMIT_SHA_ASC
  COMMIT_SHA_DESC
  REPLY_TO_ID_ASC
  REPLY_TO_ID_DESC
  CREATED_AT_ASC
  CREATED_AT_DESC
  UPDATED_AT_ASC
  UPDATED_AT_DESC
}

"""A connection to a list of \`PullRequestReview\` values."""
type PullRequestReviewConnection {
  """A list of \`PullRequestReview\` objects."""
  nodes: [PullRequestReview!]!

  """
  A list of edges which contains the \`PullRequestReview\` and cursor to aid in pagination.
  """
  edges: [PullRequestReviewEdge!]!

  """Information to aid in pagination."""
  pageInfo: PageInfo!

  """
  The count of *all* \`PullRequestReview\` you could get from the connection.
  """
  totalCount: Int!

  """
  Aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  aggregates: PullRequestReviewAggregates

  """
  Grouped aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  groupedAggregates(
    """
    The method to use when grouping \`PullRequestReview\` for these aggregates.
    """
    groupBy: [PullRequestReviewGroupBy!]!

    """Conditions on the grouped aggregates."""
    having: PullRequestReviewHavingInput
  ): [PullRequestReviewAggregates!]
}

type PullRequestReview implements Node {
  """
  A globally unique identifier. Can be used in various places throughout the system to identify this single value.
  """
  id: ID!
  rowId: UUID!
  pullRequestId: UUID!
  reviewerId: UUID!
  state: String!
  body: String
  submittedAt: Datetime
  createdAt: Datetime!
  updatedAt: Datetime!

  """
  Reads a single \`PullRequest\` that is related to this \`PullRequestReview\`.
  """
  pullRequest: PullRequest

  """Reads a single \`User\` that is related to this \`PullRequestReview\`."""
  reviewer: User
}

"""A \`PullRequestReview\` edge in the connection."""
type PullRequestReviewEdge {
  """A cursor for use in pagination."""
  cursor: Cursor

  """The \`PullRequestReview\` at the end of the edge."""
  node: PullRequestReview!
}

type PullRequestReviewAggregates {
  keys: [String]

  """
  Distinct count aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  distinctCount: PullRequestReviewDistinctCountAggregates
}

type PullRequestReviewDistinctCountAggregates {
  """Distinct count of rowId across the matching connection"""
  rowId: BigInt

  """Distinct count of pullRequestId across the matching connection"""
  pullRequestId: BigInt

  """Distinct count of reviewerId across the matching connection"""
  reviewerId: BigInt

  """Distinct count of state across the matching connection"""
  state: BigInt

  """Distinct count of body across the matching connection"""
  body: BigInt

  """Distinct count of submittedAt across the matching connection"""
  submittedAt: BigInt

  """Distinct count of createdAt across the matching connection"""
  createdAt: BigInt

  """Distinct count of updatedAt across the matching connection"""
  updatedAt: BigInt
}

"""Grouping methods for \`PullRequestReview\` for usage during aggregation."""
enum PullRequestReviewGroupBy {
  PULL_REQUEST_ID
  REVIEWER_ID
  STATE
  BODY
  SUBMITTED_AT
  SUBMITTED_AT_TRUNCATED_TO_HOUR
  SUBMITTED_AT_TRUNCATED_TO_DAY
  CREATED_AT
  CREATED_AT_TRUNCATED_TO_HOUR
  CREATED_AT_TRUNCATED_TO_DAY
  UPDATED_AT
  UPDATED_AT_TRUNCATED_TO_HOUR
  UPDATED_AT_TRUNCATED_TO_DAY
}

"""Conditions for \`PullRequestReview\` aggregates."""
input PullRequestReviewHavingInput {
  AND: [PullRequestReviewHavingInput!]
  OR: [PullRequestReviewHavingInput!]
  sum: PullRequestReviewHavingSumInput
  distinctCount: PullRequestReviewHavingDistinctCountInput
  min: PullRequestReviewHavingMinInput
  max: PullRequestReviewHavingMaxInput
  average: PullRequestReviewHavingAverageInput
  stddevSample: PullRequestReviewHavingStddevSampleInput
  stddevPopulation: PullRequestReviewHavingStddevPopulationInput
  varianceSample: PullRequestReviewHavingVarianceSampleInput
  variancePopulation: PullRequestReviewHavingVariancePopulationInput
}

input PullRequestReviewHavingSumInput {
  submittedAt: HavingDatetimeFilter
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input PullRequestReviewHavingDistinctCountInput {
  submittedAt: HavingDatetimeFilter
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input PullRequestReviewHavingMinInput {
  submittedAt: HavingDatetimeFilter
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input PullRequestReviewHavingMaxInput {
  submittedAt: HavingDatetimeFilter
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input PullRequestReviewHavingAverageInput {
  submittedAt: HavingDatetimeFilter
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input PullRequestReviewHavingStddevSampleInput {
  submittedAt: HavingDatetimeFilter
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input PullRequestReviewHavingStddevPopulationInput {
  submittedAt: HavingDatetimeFilter
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input PullRequestReviewHavingVarianceSampleInput {
  submittedAt: HavingDatetimeFilter
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input PullRequestReviewHavingVariancePopulationInput {
  submittedAt: HavingDatetimeFilter
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

"""
A condition to be used against \`PullRequestReview\` object types. All fields are
tested for equality and combined with a logical ‘and.’
"""
input PullRequestReviewCondition {
  """Checks for equality with the object’s \`rowId\` field."""
  rowId: UUID

  """Checks for equality with the object’s \`pullRequestId\` field."""
  pullRequestId: UUID

  """Checks for equality with the object’s \`reviewerId\` field."""
  reviewerId: UUID

  """Checks for equality with the object’s \`state\` field."""
  state: String

  """Checks for equality with the object’s \`body\` field."""
  body: String

  """Checks for equality with the object’s \`submittedAt\` field."""
  submittedAt: Datetime

  """Checks for equality with the object’s \`createdAt\` field."""
  createdAt: Datetime

  """Checks for equality with the object’s \`updatedAt\` field."""
  updatedAt: Datetime
}

"""Methods to use when ordering \`PullRequestReview\`."""
enum PullRequestReviewOrderBy {
  NATURAL
  PRIMARY_KEY_ASC
  PRIMARY_KEY_DESC
  ROW_ID_ASC
  ROW_ID_DESC
  PULL_REQUEST_ID_ASC
  PULL_REQUEST_ID_DESC
  REVIEWER_ID_ASC
  REVIEWER_ID_DESC
  STATE_ASC
  STATE_DESC
  BODY_ASC
  BODY_DESC
  SUBMITTED_AT_ASC
  SUBMITTED_AT_DESC
  CREATED_AT_ASC
  CREATED_AT_DESC
  UPDATED_AT_ASC
  UPDATED_AT_DESC
}

"""A \`PullRequestComment\` edge in the connection."""
type PullRequestCommentEdge {
  """A cursor for use in pagination."""
  cursor: Cursor

  """The \`PullRequestComment\` at the end of the edge."""
  node: PullRequestComment!
}

type PullRequestCommentAggregates {
  keys: [String]

  """
  Sum aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  sum: PullRequestCommentSumAggregates

  """
  Distinct count aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  distinctCount: PullRequestCommentDistinctCountAggregates

  """
  Minimum aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  min: PullRequestCommentMinAggregates

  """
  Maximum aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  max: PullRequestCommentMaxAggregates

  """
  Mean average aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  average: PullRequestCommentAverageAggregates

  """
  Sample standard deviation aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  stddevSample: PullRequestCommentStddevSampleAggregates

  """
  Population standard deviation aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  stddevPopulation: PullRequestCommentStddevPopulationAggregates

  """
  Sample variance aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  varianceSample: PullRequestCommentVarianceSampleAggregates

  """
  Population variance aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  variancePopulation: PullRequestCommentVariancePopulationAggregates
}

type PullRequestCommentSumAggregates {
  """Sum of line across the matching connection"""
  line: BigInt!
}

type PullRequestCommentDistinctCountAggregates {
  """Distinct count of rowId across the matching connection"""
  rowId: BigInt

  """Distinct count of pullRequestId across the matching connection"""
  pullRequestId: BigInt

  """Distinct count of authorId across the matching connection"""
  authorId: BigInt

  """Distinct count of body across the matching connection"""
  body: BigInt

  """Distinct count of path across the matching connection"""
  path: BigInt

  """Distinct count of line across the matching connection"""
  line: BigInt

  """Distinct count of side across the matching connection"""
  side: BigInt

  """Distinct count of commitSha across the matching connection"""
  commitSha: BigInt

  """Distinct count of replyToId across the matching connection"""
  replyToId: BigInt

  """Distinct count of createdAt across the matching connection"""
  createdAt: BigInt

  """Distinct count of updatedAt across the matching connection"""
  updatedAt: BigInt
}

type PullRequestCommentMinAggregates {
  """Minimum of line across the matching connection"""
  line: Int
}

type PullRequestCommentMaxAggregates {
  """Maximum of line across the matching connection"""
  line: Int
}

type PullRequestCommentAverageAggregates {
  """Mean average of line across the matching connection"""
  line: BigFloat
}

type PullRequestCommentStddevSampleAggregates {
  """Sample standard deviation of line across the matching connection"""
  line: BigFloat
}

type PullRequestCommentStddevPopulationAggregates {
  """Population standard deviation of line across the matching connection"""
  line: BigFloat
}

type PullRequestCommentVarianceSampleAggregates {
  """Sample variance of line across the matching connection"""
  line: BigFloat
}

type PullRequestCommentVariancePopulationAggregates {
  """Population variance of line across the matching connection"""
  line: BigFloat
}

"""
Grouping methods for \`PullRequestComment\` for usage during aggregation.
"""
enum PullRequestCommentGroupBy {
  PULL_REQUEST_ID
  AUTHOR_ID
  BODY
  PATH
  LINE
  SIDE
  COMMIT_SHA
  REPLY_TO_ID
  CREATED_AT
  CREATED_AT_TRUNCATED_TO_HOUR
  CREATED_AT_TRUNCATED_TO_DAY
  UPDATED_AT
  UPDATED_AT_TRUNCATED_TO_HOUR
  UPDATED_AT_TRUNCATED_TO_DAY
}

"""Conditions for \`PullRequestComment\` aggregates."""
input PullRequestCommentHavingInput {
  AND: [PullRequestCommentHavingInput!]
  OR: [PullRequestCommentHavingInput!]
  sum: PullRequestCommentHavingSumInput
  distinctCount: PullRequestCommentHavingDistinctCountInput
  min: PullRequestCommentHavingMinInput
  max: PullRequestCommentHavingMaxInput
  average: PullRequestCommentHavingAverageInput
  stddevSample: PullRequestCommentHavingStddevSampleInput
  stddevPopulation: PullRequestCommentHavingStddevPopulationInput
  varianceSample: PullRequestCommentHavingVarianceSampleInput
  variancePopulation: PullRequestCommentHavingVariancePopulationInput
}

input PullRequestCommentHavingSumInput {
  line: HavingIntFilter
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input HavingIntFilter {
  equalTo: Int
  notEqualTo: Int
  greaterThan: Int
  greaterThanOrEqualTo: Int
  lessThan: Int
  lessThanOrEqualTo: Int
}

input PullRequestCommentHavingDistinctCountInput {
  line: HavingIntFilter
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input PullRequestCommentHavingMinInput {
  line: HavingIntFilter
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input PullRequestCommentHavingMaxInput {
  line: HavingIntFilter
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input PullRequestCommentHavingAverageInput {
  line: HavingIntFilter
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input PullRequestCommentHavingStddevSampleInput {
  line: HavingIntFilter
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input PullRequestCommentHavingStddevPopulationInput {
  line: HavingIntFilter
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input PullRequestCommentHavingVarianceSampleInput {
  line: HavingIntFilter
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input PullRequestCommentHavingVariancePopulationInput {
  line: HavingIntFilter
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

"""A connection to a list of \`PullRequest\` values."""
type PullRequestConnection {
  """A list of \`PullRequest\` objects."""
  nodes: [PullRequest!]!

  """
  A list of edges which contains the \`PullRequest\` and cursor to aid in pagination.
  """
  edges: [PullRequestEdge!]!

  """Information to aid in pagination."""
  pageInfo: PageInfo!

  """The count of *all* \`PullRequest\` you could get from the connection."""
  totalCount: Int!

  """
  Aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  aggregates: PullRequestAggregates

  """
  Grouped aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  groupedAggregates(
    """The method to use when grouping \`PullRequest\` for these aggregates."""
    groupBy: [PullRequestGroupBy!]!

    """Conditions on the grouped aggregates."""
    having: PullRequestHavingInput
  ): [PullRequestAggregates!]
}

"""A \`PullRequest\` edge in the connection."""
type PullRequestEdge {
  """A cursor for use in pagination."""
  cursor: Cursor

  """The \`PullRequest\` at the end of the edge."""
  node: PullRequest!
}

type PullRequestAggregates {
  keys: [String]

  """
  Sum aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  sum: PullRequestSumAggregates

  """
  Distinct count aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  distinctCount: PullRequestDistinctCountAggregates

  """
  Minimum aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  min: PullRequestMinAggregates

  """
  Maximum aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  max: PullRequestMaxAggregates

  """
  Mean average aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  average: PullRequestAverageAggregates

  """
  Sample standard deviation aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  stddevSample: PullRequestStddevSampleAggregates

  """
  Population standard deviation aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  stddevPopulation: PullRequestStddevPopulationAggregates

  """
  Sample variance aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  varianceSample: PullRequestVarianceSampleAggregates

  """
  Population variance aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  variancePopulation: PullRequestVariancePopulationAggregates
}

type PullRequestSumAggregates {
  """Sum of number across the matching connection"""
  number: BigInt!
}

type PullRequestDistinctCountAggregates {
  """Distinct count of rowId across the matching connection"""
  rowId: BigInt

  """Distinct count of number across the matching connection"""
  number: BigInt

  """Distinct count of repositoryId across the matching connection"""
  repositoryId: BigInt

  """Distinct count of authorId across the matching connection"""
  authorId: BigInt

  """Distinct count of title across the matching connection"""
  title: BigInt

  """Distinct count of description across the matching connection"""
  description: BigInt

  """Distinct count of state across the matching connection"""
  state: BigInt

  """Distinct count of sourceBranch across the matching connection"""
  sourceBranch: BigInt

  """Distinct count of targetBranch across the matching connection"""
  targetBranch: BigInt

  """Distinct count of mergeCommitSha across the matching connection"""
  mergeCommitSha: BigInt

  """Distinct count of mergedAt across the matching connection"""
  mergedAt: BigInt

  """Distinct count of mergedById across the matching connection"""
  mergedById: BigInt

  """Distinct count of closedAt across the matching connection"""
  closedAt: BigInt

  """Distinct count of createdAt across the matching connection"""
  createdAt: BigInt

  """Distinct count of updatedAt across the matching connection"""
  updatedAt: BigInt
}

type PullRequestMinAggregates {
  """Minimum of number across the matching connection"""
  number: Int
}

type PullRequestMaxAggregates {
  """Maximum of number across the matching connection"""
  number: Int
}

type PullRequestAverageAggregates {
  """Mean average of number across the matching connection"""
  number: BigFloat
}

type PullRequestStddevSampleAggregates {
  """Sample standard deviation of number across the matching connection"""
  number: BigFloat
}

type PullRequestStddevPopulationAggregates {
  """Population standard deviation of number across the matching connection"""
  number: BigFloat
}

type PullRequestVarianceSampleAggregates {
  """Sample variance of number across the matching connection"""
  number: BigFloat
}

type PullRequestVariancePopulationAggregates {
  """Population variance of number across the matching connection"""
  number: BigFloat
}

"""Grouping methods for \`PullRequest\` for usage during aggregation."""
enum PullRequestGroupBy {
  NUMBER
  REPOSITORY_ID
  AUTHOR_ID
  TITLE
  DESCRIPTION
  STATE
  SOURCE_BRANCH
  TARGET_BRANCH
  MERGE_COMMIT_SHA
  MERGED_AT
  MERGED_AT_TRUNCATED_TO_HOUR
  MERGED_AT_TRUNCATED_TO_DAY
  MERGED_BY_ID
  CLOSED_AT
  CLOSED_AT_TRUNCATED_TO_HOUR
  CLOSED_AT_TRUNCATED_TO_DAY
  CREATED_AT
  CREATED_AT_TRUNCATED_TO_HOUR
  CREATED_AT_TRUNCATED_TO_DAY
  UPDATED_AT
  UPDATED_AT_TRUNCATED_TO_HOUR
  UPDATED_AT_TRUNCATED_TO_DAY
}

"""Conditions for \`PullRequest\` aggregates."""
input PullRequestHavingInput {
  AND: [PullRequestHavingInput!]
  OR: [PullRequestHavingInput!]
  sum: PullRequestHavingSumInput
  distinctCount: PullRequestHavingDistinctCountInput
  min: PullRequestHavingMinInput
  max: PullRequestHavingMaxInput
  average: PullRequestHavingAverageInput
  stddevSample: PullRequestHavingStddevSampleInput
  stddevPopulation: PullRequestHavingStddevPopulationInput
  varianceSample: PullRequestHavingVarianceSampleInput
  variancePopulation: PullRequestHavingVariancePopulationInput
}

input PullRequestHavingSumInput {
  number: HavingIntFilter
  mergedAt: HavingDatetimeFilter
  closedAt: HavingDatetimeFilter
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input PullRequestHavingDistinctCountInput {
  number: HavingIntFilter
  mergedAt: HavingDatetimeFilter
  closedAt: HavingDatetimeFilter
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input PullRequestHavingMinInput {
  number: HavingIntFilter
  mergedAt: HavingDatetimeFilter
  closedAt: HavingDatetimeFilter
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input PullRequestHavingMaxInput {
  number: HavingIntFilter
  mergedAt: HavingDatetimeFilter
  closedAt: HavingDatetimeFilter
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input PullRequestHavingAverageInput {
  number: HavingIntFilter
  mergedAt: HavingDatetimeFilter
  closedAt: HavingDatetimeFilter
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input PullRequestHavingStddevSampleInput {
  number: HavingIntFilter
  mergedAt: HavingDatetimeFilter
  closedAt: HavingDatetimeFilter
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input PullRequestHavingStddevPopulationInput {
  number: HavingIntFilter
  mergedAt: HavingDatetimeFilter
  closedAt: HavingDatetimeFilter
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input PullRequestHavingVarianceSampleInput {
  number: HavingIntFilter
  mergedAt: HavingDatetimeFilter
  closedAt: HavingDatetimeFilter
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input PullRequestHavingVariancePopulationInput {
  number: HavingIntFilter
  mergedAt: HavingDatetimeFilter
  closedAt: HavingDatetimeFilter
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

"""
A condition to be used against \`PullRequest\` object types. All fields are tested
for equality and combined with a logical ‘and.’
"""
input PullRequestCondition {
  """Checks for equality with the object’s \`rowId\` field."""
  rowId: UUID

  """Checks for equality with the object’s \`number\` field."""
  number: Int

  """Checks for equality with the object’s \`repositoryId\` field."""
  repositoryId: UUID

  """Checks for equality with the object’s \`authorId\` field."""
  authorId: UUID

  """Checks for equality with the object’s \`title\` field."""
  title: String

  """Checks for equality with the object’s \`description\` field."""
  description: String

  """Checks for equality with the object’s \`state\` field."""
  state: String

  """Checks for equality with the object’s \`sourceBranch\` field."""
  sourceBranch: String

  """Checks for equality with the object’s \`targetBranch\` field."""
  targetBranch: String

  """Checks for equality with the object’s \`mergeCommitSha\` field."""
  mergeCommitSha: String

  """Checks for equality with the object’s \`mergedAt\` field."""
  mergedAt: Datetime

  """Checks for equality with the object’s \`mergedById\` field."""
  mergedById: UUID

  """Checks for equality with the object’s \`closedAt\` field."""
  closedAt: Datetime

  """Checks for equality with the object’s \`createdAt\` field."""
  createdAt: Datetime

  """Checks for equality with the object’s \`updatedAt\` field."""
  updatedAt: Datetime
}

"""Methods to use when ordering \`PullRequest\`."""
enum PullRequestOrderBy {
  NATURAL
  PRIMARY_KEY_ASC
  PRIMARY_KEY_DESC
  ROW_ID_ASC
  ROW_ID_DESC
  NUMBER_ASC
  NUMBER_DESC
  REPOSITORY_ID_ASC
  REPOSITORY_ID_DESC
  AUTHOR_ID_ASC
  AUTHOR_ID_DESC
  TITLE_ASC
  TITLE_DESC
  DESCRIPTION_ASC
  DESCRIPTION_DESC
  STATE_ASC
  STATE_DESC
  SOURCE_BRANCH_ASC
  SOURCE_BRANCH_DESC
  TARGET_BRANCH_ASC
  TARGET_BRANCH_DESC
  MERGE_COMMIT_SHA_ASC
  MERGE_COMMIT_SHA_DESC
  MERGED_AT_ASC
  MERGED_AT_DESC
  MERGED_BY_ID_ASC
  MERGED_BY_ID_DESC
  CLOSED_AT_ASC
  CLOSED_AT_DESC
  CREATED_AT_ASC
  CREATED_AT_DESC
  UPDATED_AT_ASC
  UPDATED_AT_DESC
  PULL_REQUEST_COMMENTS_COUNT_ASC
  PULL_REQUEST_COMMENTS_COUNT_DESC
  PULL_REQUEST_COMMENTS_SUM_LINE_ASC
  PULL_REQUEST_COMMENTS_SUM_LINE_DESC
  PULL_REQUEST_COMMENTS_DISTINCT_COUNT_ROW_ID_ASC
  PULL_REQUEST_COMMENTS_DISTINCT_COUNT_ROW_ID_DESC
  PULL_REQUEST_COMMENTS_DISTINCT_COUNT_PULL_REQUEST_ID_ASC
  PULL_REQUEST_COMMENTS_DISTINCT_COUNT_PULL_REQUEST_ID_DESC
  PULL_REQUEST_COMMENTS_DISTINCT_COUNT_AUTHOR_ID_ASC
  PULL_REQUEST_COMMENTS_DISTINCT_COUNT_AUTHOR_ID_DESC
  PULL_REQUEST_COMMENTS_DISTINCT_COUNT_BODY_ASC
  PULL_REQUEST_COMMENTS_DISTINCT_COUNT_BODY_DESC
  PULL_REQUEST_COMMENTS_DISTINCT_COUNT_PATH_ASC
  PULL_REQUEST_COMMENTS_DISTINCT_COUNT_PATH_DESC
  PULL_REQUEST_COMMENTS_DISTINCT_COUNT_LINE_ASC
  PULL_REQUEST_COMMENTS_DISTINCT_COUNT_LINE_DESC
  PULL_REQUEST_COMMENTS_DISTINCT_COUNT_SIDE_ASC
  PULL_REQUEST_COMMENTS_DISTINCT_COUNT_SIDE_DESC
  PULL_REQUEST_COMMENTS_DISTINCT_COUNT_COMMIT_SHA_ASC
  PULL_REQUEST_COMMENTS_DISTINCT_COUNT_COMMIT_SHA_DESC
  PULL_REQUEST_COMMENTS_DISTINCT_COUNT_REPLY_TO_ID_ASC
  PULL_REQUEST_COMMENTS_DISTINCT_COUNT_REPLY_TO_ID_DESC
  PULL_REQUEST_COMMENTS_DISTINCT_COUNT_CREATED_AT_ASC
  PULL_REQUEST_COMMENTS_DISTINCT_COUNT_CREATED_AT_DESC
  PULL_REQUEST_COMMENTS_DISTINCT_COUNT_UPDATED_AT_ASC
  PULL_REQUEST_COMMENTS_DISTINCT_COUNT_UPDATED_AT_DESC
  PULL_REQUEST_COMMENTS_MIN_LINE_ASC
  PULL_REQUEST_COMMENTS_MIN_LINE_DESC
  PULL_REQUEST_COMMENTS_MAX_LINE_ASC
  PULL_REQUEST_COMMENTS_MAX_LINE_DESC
  PULL_REQUEST_COMMENTS_AVERAGE_LINE_ASC
  PULL_REQUEST_COMMENTS_AVERAGE_LINE_DESC
  PULL_REQUEST_COMMENTS_STDDEV_SAMPLE_LINE_ASC
  PULL_REQUEST_COMMENTS_STDDEV_SAMPLE_LINE_DESC
  PULL_REQUEST_COMMENTS_STDDEV_POPULATION_LINE_ASC
  PULL_REQUEST_COMMENTS_STDDEV_POPULATION_LINE_DESC
  PULL_REQUEST_COMMENTS_VARIANCE_SAMPLE_LINE_ASC
  PULL_REQUEST_COMMENTS_VARIANCE_SAMPLE_LINE_DESC
  PULL_REQUEST_COMMENTS_VARIANCE_POPULATION_LINE_ASC
  PULL_REQUEST_COMMENTS_VARIANCE_POPULATION_LINE_DESC
  PULL_REQUEST_REVIEWS_COUNT_ASC
  PULL_REQUEST_REVIEWS_COUNT_DESC
  PULL_REQUEST_REVIEWS_DISTINCT_COUNT_ROW_ID_ASC
  PULL_REQUEST_REVIEWS_DISTINCT_COUNT_ROW_ID_DESC
  PULL_REQUEST_REVIEWS_DISTINCT_COUNT_PULL_REQUEST_ID_ASC
  PULL_REQUEST_REVIEWS_DISTINCT_COUNT_PULL_REQUEST_ID_DESC
  PULL_REQUEST_REVIEWS_DISTINCT_COUNT_REVIEWER_ID_ASC
  PULL_REQUEST_REVIEWS_DISTINCT_COUNT_REVIEWER_ID_DESC
  PULL_REQUEST_REVIEWS_DISTINCT_COUNT_STATE_ASC
  PULL_REQUEST_REVIEWS_DISTINCT_COUNT_STATE_DESC
  PULL_REQUEST_REVIEWS_DISTINCT_COUNT_BODY_ASC
  PULL_REQUEST_REVIEWS_DISTINCT_COUNT_BODY_DESC
  PULL_REQUEST_REVIEWS_DISTINCT_COUNT_SUBMITTED_AT_ASC
  PULL_REQUEST_REVIEWS_DISTINCT_COUNT_SUBMITTED_AT_DESC
  PULL_REQUEST_REVIEWS_DISTINCT_COUNT_CREATED_AT_ASC
  PULL_REQUEST_REVIEWS_DISTINCT_COUNT_CREATED_AT_DESC
  PULL_REQUEST_REVIEWS_DISTINCT_COUNT_UPDATED_AT_ASC
  PULL_REQUEST_REVIEWS_DISTINCT_COUNT_UPDATED_AT_DESC
}

"""A connection to a list of \`ExternalDependency\` values."""
type ExternalDependencyConnection {
  """A list of \`ExternalDependency\` objects."""
  nodes: [ExternalDependency!]!

  """
  A list of edges which contains the \`ExternalDependency\` and cursor to aid in pagination.
  """
  edges: [ExternalDependencyEdge!]!

  """Information to aid in pagination."""
  pageInfo: PageInfo!

  """
  The count of *all* \`ExternalDependency\` you could get from the connection.
  """
  totalCount: Int!

  """
  Aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  aggregates: ExternalDependencyAggregates

  """
  Grouped aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  groupedAggregates(
    """
    The method to use when grouping \`ExternalDependency\` for these aggregates.
    """
    groupBy: [ExternalDependencyGroupBy!]!

    """Conditions on the grouped aggregates."""
    having: ExternalDependencyHavingInput
  ): [ExternalDependencyAggregates!]
}

type ExternalDependency implements Node {
  """
  A globally unique identifier. Can be used in various places throughout the system to identify this single value.
  """
  id: ID!
  rowId: UUID!
  repositoryId: UUID!
  packageManager: String!
  packageName: String!
  versionConstraint: String
  detectionSource: String!
  createdAt: Datetime!

  """
  Reads a single \`Repository\` that is related to this \`ExternalDependency\`.
  """
  repository: Repository
}

"""A \`ExternalDependency\` edge in the connection."""
type ExternalDependencyEdge {
  """A cursor for use in pagination."""
  cursor: Cursor

  """The \`ExternalDependency\` at the end of the edge."""
  node: ExternalDependency!
}

type ExternalDependencyAggregates {
  keys: [String]

  """
  Distinct count aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  distinctCount: ExternalDependencyDistinctCountAggregates
}

type ExternalDependencyDistinctCountAggregates {
  """Distinct count of rowId across the matching connection"""
  rowId: BigInt

  """Distinct count of repositoryId across the matching connection"""
  repositoryId: BigInt

  """Distinct count of packageManager across the matching connection"""
  packageManager: BigInt

  """Distinct count of packageName across the matching connection"""
  packageName: BigInt

  """Distinct count of versionConstraint across the matching connection"""
  versionConstraint: BigInt

  """Distinct count of detectionSource across the matching connection"""
  detectionSource: BigInt

  """Distinct count of createdAt across the matching connection"""
  createdAt: BigInt
}

"""
Grouping methods for \`ExternalDependency\` for usage during aggregation.
"""
enum ExternalDependencyGroupBy {
  REPOSITORY_ID
  PACKAGE_MANAGER
  PACKAGE_NAME
  VERSION_CONSTRAINT
  DETECTION_SOURCE
  CREATED_AT
  CREATED_AT_TRUNCATED_TO_HOUR
  CREATED_AT_TRUNCATED_TO_DAY
}

"""Conditions for \`ExternalDependency\` aggregates."""
input ExternalDependencyHavingInput {
  AND: [ExternalDependencyHavingInput!]
  OR: [ExternalDependencyHavingInput!]
  sum: ExternalDependencyHavingSumInput
  distinctCount: ExternalDependencyHavingDistinctCountInput
  min: ExternalDependencyHavingMinInput
  max: ExternalDependencyHavingMaxInput
  average: ExternalDependencyHavingAverageInput
  stddevSample: ExternalDependencyHavingStddevSampleInput
  stddevPopulation: ExternalDependencyHavingStddevPopulationInput
  varianceSample: ExternalDependencyHavingVarianceSampleInput
  variancePopulation: ExternalDependencyHavingVariancePopulationInput
}

input ExternalDependencyHavingSumInput {
  createdAt: HavingDatetimeFilter
}

input ExternalDependencyHavingDistinctCountInput {
  createdAt: HavingDatetimeFilter
}

input ExternalDependencyHavingMinInput {
  createdAt: HavingDatetimeFilter
}

input ExternalDependencyHavingMaxInput {
  createdAt: HavingDatetimeFilter
}

input ExternalDependencyHavingAverageInput {
  createdAt: HavingDatetimeFilter
}

input ExternalDependencyHavingStddevSampleInput {
  createdAt: HavingDatetimeFilter
}

input ExternalDependencyHavingStddevPopulationInput {
  createdAt: HavingDatetimeFilter
}

input ExternalDependencyHavingVarianceSampleInput {
  createdAt: HavingDatetimeFilter
}

input ExternalDependencyHavingVariancePopulationInput {
  createdAt: HavingDatetimeFilter
}

"""
A condition to be used against \`ExternalDependency\` object types. All fields are
tested for equality and combined with a logical ‘and.’
"""
input ExternalDependencyCondition {
  """Checks for equality with the object’s \`rowId\` field."""
  rowId: UUID

  """Checks for equality with the object’s \`repositoryId\` field."""
  repositoryId: UUID

  """Checks for equality with the object’s \`packageManager\` field."""
  packageManager: String

  """Checks for equality with the object’s \`packageName\` field."""
  packageName: String

  """Checks for equality with the object’s \`versionConstraint\` field."""
  versionConstraint: String

  """Checks for equality with the object’s \`detectionSource\` field."""
  detectionSource: String

  """Checks for equality with the object’s \`createdAt\` field."""
  createdAt: Datetime
}

"""Methods to use when ordering \`ExternalDependency\`."""
enum ExternalDependencyOrderBy {
  NATURAL
  PRIMARY_KEY_ASC
  PRIMARY_KEY_DESC
  ROW_ID_ASC
  ROW_ID_DESC
  REPOSITORY_ID_ASC
  REPOSITORY_ID_DESC
  PACKAGE_MANAGER_ASC
  PACKAGE_MANAGER_DESC
  PACKAGE_NAME_ASC
  PACKAGE_NAME_DESC
  VERSION_CONSTRAINT_ASC
  VERSION_CONSTRAINT_DESC
  DETECTION_SOURCE_ASC
  DETECTION_SOURCE_DESC
  CREATED_AT_ASC
  CREATED_AT_DESC
}

"""A connection to a list of \`RepositoryRelationship\` values."""
type RepositoryRelationshipConnection {
  """A list of \`RepositoryRelationship\` objects."""
  nodes: [RepositoryRelationship!]!

  """
  A list of edges which contains the \`RepositoryRelationship\` and cursor to aid in pagination.
  """
  edges: [RepositoryRelationshipEdge!]!

  """Information to aid in pagination."""
  pageInfo: PageInfo!

  """
  The count of *all* \`RepositoryRelationship\` you could get from the connection.
  """
  totalCount: Int!

  """
  Aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  aggregates: RepositoryRelationshipAggregates

  """
  Grouped aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  groupedAggregates(
    """
    The method to use when grouping \`RepositoryRelationship\` for these aggregates.
    """
    groupBy: [RepositoryRelationshipGroupBy!]!

    """Conditions on the grouped aggregates."""
    having: RepositoryRelationshipHavingInput
  ): [RepositoryRelationshipAggregates!]
}

"""A \`RepositoryRelationship\` edge in the connection."""
type RepositoryRelationshipEdge {
  """A cursor for use in pagination."""
  cursor: Cursor

  """The \`RepositoryRelationship\` at the end of the edge."""
  node: RepositoryRelationship!
}

type RepositoryRelationshipAggregates {
  keys: [String]

  """
  Sum aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  sum: RepositoryRelationshipSumAggregates

  """
  Distinct count aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  distinctCount: RepositoryRelationshipDistinctCountAggregates

  """
  Minimum aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  min: RepositoryRelationshipMinAggregates

  """
  Maximum aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  max: RepositoryRelationshipMaxAggregates

  """
  Mean average aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  average: RepositoryRelationshipAverageAggregates

  """
  Sample standard deviation aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  stddevSample: RepositoryRelationshipStddevSampleAggregates

  """
  Population standard deviation aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  stddevPopulation: RepositoryRelationshipStddevPopulationAggregates

  """
  Sample variance aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  varianceSample: RepositoryRelationshipVarianceSampleAggregates

  """
  Population variance aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  variancePopulation: RepositoryRelationshipVariancePopulationAggregates
}

type RepositoryRelationshipSumAggregates {
  """Sum of confidence across the matching connection"""
  confidence: Float!
}

type RepositoryRelationshipDistinctCountAggregates {
  """Distinct count of rowId across the matching connection"""
  rowId: BigInt

  """Distinct count of sourceRepositoryId across the matching connection"""
  sourceRepositoryId: BigInt

  """Distinct count of targetRepositoryId across the matching connection"""
  targetRepositoryId: BigInt

  """Distinct count of relationshipTypeId across the matching connection"""
  relationshipTypeId: BigInt

  """Distinct count of detectionSource across the matching connection"""
  detectionSource: BigInt

  """Distinct count of confidence across the matching connection"""
  confidence: BigInt

  """Distinct count of versionConstraint across the matching connection"""
  versionConstraint: BigInt

  """Distinct count of branch across the matching connection"""
  branch: BigInt

  """Distinct count of createdAt across the matching connection"""
  createdAt: BigInt

  """Distinct count of updatedAt across the matching connection"""
  updatedAt: BigInt
}

type RepositoryRelationshipMinAggregates {
  """Minimum of confidence across the matching connection"""
  confidence: Float
}

type RepositoryRelationshipMaxAggregates {
  """Maximum of confidence across the matching connection"""
  confidence: Float
}

type RepositoryRelationshipAverageAggregates {
  """Mean average of confidence across the matching connection"""
  confidence: Float
}

type RepositoryRelationshipStddevSampleAggregates {
  """Sample standard deviation of confidence across the matching connection"""
  confidence: Float
}

type RepositoryRelationshipStddevPopulationAggregates {
  """
  Population standard deviation of confidence across the matching connection
  """
  confidence: Float
}

type RepositoryRelationshipVarianceSampleAggregates {
  """Sample variance of confidence across the matching connection"""
  confidence: Float
}

type RepositoryRelationshipVariancePopulationAggregates {
  """Population variance of confidence across the matching connection"""
  confidence: Float
}

"""
Grouping methods for \`RepositoryRelationship\` for usage during aggregation.
"""
enum RepositoryRelationshipGroupBy {
  SOURCE_REPOSITORY_ID
  TARGET_REPOSITORY_ID
  RELATIONSHIP_TYPE_ID
  DETECTION_SOURCE
  CONFIDENCE
  VERSION_CONSTRAINT
  BRANCH
  CREATED_AT
  CREATED_AT_TRUNCATED_TO_HOUR
  CREATED_AT_TRUNCATED_TO_DAY
  UPDATED_AT
  UPDATED_AT_TRUNCATED_TO_HOUR
  UPDATED_AT_TRUNCATED_TO_DAY
}

"""Conditions for \`RepositoryRelationship\` aggregates."""
input RepositoryRelationshipHavingInput {
  AND: [RepositoryRelationshipHavingInput!]
  OR: [RepositoryRelationshipHavingInput!]
  sum: RepositoryRelationshipHavingSumInput
  distinctCount: RepositoryRelationshipHavingDistinctCountInput
  min: RepositoryRelationshipHavingMinInput
  max: RepositoryRelationshipHavingMaxInput
  average: RepositoryRelationshipHavingAverageInput
  stddevSample: RepositoryRelationshipHavingStddevSampleInput
  stddevPopulation: RepositoryRelationshipHavingStddevPopulationInput
  varianceSample: RepositoryRelationshipHavingVarianceSampleInput
  variancePopulation: RepositoryRelationshipHavingVariancePopulationInput
}

input RepositoryRelationshipHavingSumInput {
  confidence: HavingFloatFilter
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input HavingFloatFilter {
  equalTo: Float
  notEqualTo: Float
  greaterThan: Float
  greaterThanOrEqualTo: Float
  lessThan: Float
  lessThanOrEqualTo: Float
}

input RepositoryRelationshipHavingDistinctCountInput {
  confidence: HavingFloatFilter
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input RepositoryRelationshipHavingMinInput {
  confidence: HavingFloatFilter
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input RepositoryRelationshipHavingMaxInput {
  confidence: HavingFloatFilter
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input RepositoryRelationshipHavingAverageInput {
  confidence: HavingFloatFilter
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input RepositoryRelationshipHavingStddevSampleInput {
  confidence: HavingFloatFilter
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input RepositoryRelationshipHavingStddevPopulationInput {
  confidence: HavingFloatFilter
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input RepositoryRelationshipHavingVarianceSampleInput {
  confidence: HavingFloatFilter
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input RepositoryRelationshipHavingVariancePopulationInput {
  confidence: HavingFloatFilter
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

"""
A condition to be used against \`RepositoryRelationship\` object types. All fields
are tested for equality and combined with a logical ‘and.’
"""
input RepositoryRelationshipCondition {
  """Checks for equality with the object’s \`rowId\` field."""
  rowId: UUID

  """Checks for equality with the object’s \`sourceRepositoryId\` field."""
  sourceRepositoryId: UUID

  """Checks for equality with the object’s \`targetRepositoryId\` field."""
  targetRepositoryId: UUID

  """Checks for equality with the object’s \`relationshipTypeId\` field."""
  relationshipTypeId: UUID

  """Checks for equality with the object’s \`detectionSource\` field."""
  detectionSource: String

  """Checks for equality with the object’s \`confidence\` field."""
  confidence: Float

  """Checks for equality with the object’s \`versionConstraint\` field."""
  versionConstraint: String

  """Checks for equality with the object’s \`branch\` field."""
  branch: String

  """Checks for equality with the object’s \`createdAt\` field."""
  createdAt: Datetime

  """Checks for equality with the object’s \`updatedAt\` field."""
  updatedAt: Datetime
}

"""Methods to use when ordering \`RepositoryRelationship\`."""
enum RepositoryRelationshipOrderBy {
  NATURAL
  PRIMARY_KEY_ASC
  PRIMARY_KEY_DESC
  ROW_ID_ASC
  ROW_ID_DESC
  SOURCE_REPOSITORY_ID_ASC
  SOURCE_REPOSITORY_ID_DESC
  TARGET_REPOSITORY_ID_ASC
  TARGET_REPOSITORY_ID_DESC
  RELATIONSHIP_TYPE_ID_ASC
  RELATIONSHIP_TYPE_ID_DESC
  DETECTION_SOURCE_ASC
  DETECTION_SOURCE_DESC
  CONFIDENCE_ASC
  CONFIDENCE_DESC
  VERSION_CONSTRAINT_ASC
  VERSION_CONSTRAINT_DESC
  BRANCH_ASC
  BRANCH_DESC
  CREATED_AT_ASC
  CREATED_AT_DESC
  UPDATED_AT_ASC
  UPDATED_AT_DESC
  REPOSITORY_RELATIONSHIP_METADATA_BY_RELATIONSHIP_ID_COUNT_ASC
  REPOSITORY_RELATIONSHIP_METADATA_BY_RELATIONSHIP_ID_COUNT_DESC
  REPOSITORY_RELATIONSHIP_METADATA_BY_RELATIONSHIP_ID_DISTINCT_COUNT_ROW_ID_ASC
  REPOSITORY_RELATIONSHIP_METADATA_BY_RELATIONSHIP_ID_DISTINCT_COUNT_ROW_ID_DESC
  REPOSITORY_RELATIONSHIP_METADATA_BY_RELATIONSHIP_ID_DISTINCT_COUNT_RELATIONSHIP_ID_ASC
  REPOSITORY_RELATIONSHIP_METADATA_BY_RELATIONSHIP_ID_DISTINCT_COUNT_RELATIONSHIP_ID_DESC
  REPOSITORY_RELATIONSHIP_METADATA_BY_RELATIONSHIP_ID_DISTINCT_COUNT_KEY_ASC
  REPOSITORY_RELATIONSHIP_METADATA_BY_RELATIONSHIP_ID_DISTINCT_COUNT_KEY_DESC
  REPOSITORY_RELATIONSHIP_METADATA_BY_RELATIONSHIP_ID_DISTINCT_COUNT_VALUE_ASC
  REPOSITORY_RELATIONSHIP_METADATA_BY_RELATIONSHIP_ID_DISTINCT_COUNT_VALUE_DESC
  REPOSITORY_RELATIONSHIP_METADATA_BY_RELATIONSHIP_ID_DISTINCT_COUNT_CREATED_AT_ASC
  REPOSITORY_RELATIONSHIP_METADATA_BY_RELATIONSHIP_ID_DISTINCT_COUNT_CREATED_AT_DESC
}

"""A \`Repository\` edge in the connection."""
type RepositoryEdge {
  """A cursor for use in pagination."""
  cursor: Cursor

  """The \`Repository\` at the end of the edge."""
  node: Repository!
}

type RepositoryAggregates {
  keys: [String]

  """
  Distinct count aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  distinctCount: RepositoryDistinctCountAggregates
}

type RepositoryDistinctCountAggregates {
  """Distinct count of rowId across the matching connection"""
  rowId: BigInt

  """Distinct count of ownerId across the matching connection"""
  ownerId: BigInt

  """Distinct count of organizationId across the matching connection"""
  organizationId: BigInt

  """Distinct count of name across the matching connection"""
  name: BigInt

  """Distinct count of slug across the matching connection"""
  slug: BigInt

  """Distinct count of description across the matching connection"""
  description: BigInt

  """Distinct count of visibility across the matching connection"""
  visibility: BigInt

  """Distinct count of defaultBranch across the matching connection"""
  defaultBranch: BigInt

  """Distinct count of createdAt across the matching connection"""
  createdAt: BigInt

  """Distinct count of updatedAt across the matching connection"""
  updatedAt: BigInt
}

"""Grouping methods for \`Repository\` for usage during aggregation."""
enum RepositoryGroupBy {
  OWNER_ID
  ORGANIZATION_ID
  NAME
  SLUG
  DESCRIPTION
  VISIBILITY
  DEFAULT_BRANCH
  CREATED_AT
  CREATED_AT_TRUNCATED_TO_HOUR
  CREATED_AT_TRUNCATED_TO_DAY
  UPDATED_AT
  UPDATED_AT_TRUNCATED_TO_HOUR
  UPDATED_AT_TRUNCATED_TO_DAY
}

"""Conditions for \`Repository\` aggregates."""
input RepositoryHavingInput {
  AND: [RepositoryHavingInput!]
  OR: [RepositoryHavingInput!]
  sum: RepositoryHavingSumInput
  distinctCount: RepositoryHavingDistinctCountInput
  min: RepositoryHavingMinInput
  max: RepositoryHavingMaxInput
  average: RepositoryHavingAverageInput
  stddevSample: RepositoryHavingStddevSampleInput
  stddevPopulation: RepositoryHavingStddevPopulationInput
  varianceSample: RepositoryHavingVarianceSampleInput
  variancePopulation: RepositoryHavingVariancePopulationInput
}

input RepositoryHavingSumInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input RepositoryHavingDistinctCountInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input RepositoryHavingMinInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input RepositoryHavingMaxInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input RepositoryHavingAverageInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input RepositoryHavingStddevSampleInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input RepositoryHavingStddevPopulationInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input RepositoryHavingVarianceSampleInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input RepositoryHavingVariancePopulationInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

"""A connection to a list of \`RepositoryRelationshipType\` values."""
type RepositoryRelationshipTypeConnection {
  """A list of \`RepositoryRelationshipType\` objects."""
  nodes: [RepositoryRelationshipType!]!

  """
  A list of edges which contains the \`RepositoryRelationshipType\` and cursor to aid in pagination.
  """
  edges: [RepositoryRelationshipTypeEdge!]!

  """Information to aid in pagination."""
  pageInfo: PageInfo!

  """
  The count of *all* \`RepositoryRelationshipType\` you could get from the connection.
  """
  totalCount: Int!

  """
  Aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  aggregates: RepositoryRelationshipTypeAggregates

  """
  Grouped aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  groupedAggregates(
    """
    The method to use when grouping \`RepositoryRelationshipType\` for these aggregates.
    """
    groupBy: [RepositoryRelationshipTypeGroupBy!]!

    """Conditions on the grouped aggregates."""
    having: RepositoryRelationshipTypeHavingInput
  ): [RepositoryRelationshipTypeAggregates!]
}

"""A \`RepositoryRelationshipType\` edge in the connection."""
type RepositoryRelationshipTypeEdge {
  """A cursor for use in pagination."""
  cursor: Cursor

  """The \`RepositoryRelationshipType\` at the end of the edge."""
  node: RepositoryRelationshipType!
}

type RepositoryRelationshipTypeAggregates {
  keys: [String]

  """
  Distinct count aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  distinctCount: RepositoryRelationshipTypeDistinctCountAggregates
}

type RepositoryRelationshipTypeDistinctCountAggregates {
  """Distinct count of rowId across the matching connection"""
  rowId: BigInt

  """Distinct count of name across the matching connection"""
  name: BigInt

  """Distinct count of description across the matching connection"""
  description: BigInt

  """Distinct count of isDirected across the matching connection"""
  isDirected: BigInt

  """Distinct count of organizationId across the matching connection"""
  organizationId: BigInt

  """Distinct count of createdAt across the matching connection"""
  createdAt: BigInt
}

"""
Grouping methods for \`RepositoryRelationshipType\` for usage during aggregation.
"""
enum RepositoryRelationshipTypeGroupBy {
  NAME
  DESCRIPTION
  IS_DIRECTED
  ORGANIZATION_ID
  CREATED_AT
  CREATED_AT_TRUNCATED_TO_HOUR
  CREATED_AT_TRUNCATED_TO_DAY
}

"""Conditions for \`RepositoryRelationshipType\` aggregates."""
input RepositoryRelationshipTypeHavingInput {
  AND: [RepositoryRelationshipTypeHavingInput!]
  OR: [RepositoryRelationshipTypeHavingInput!]
  sum: RepositoryRelationshipTypeHavingSumInput
  distinctCount: RepositoryRelationshipTypeHavingDistinctCountInput
  min: RepositoryRelationshipTypeHavingMinInput
  max: RepositoryRelationshipTypeHavingMaxInput
  average: RepositoryRelationshipTypeHavingAverageInput
  stddevSample: RepositoryRelationshipTypeHavingStddevSampleInput
  stddevPopulation: RepositoryRelationshipTypeHavingStddevPopulationInput
  varianceSample: RepositoryRelationshipTypeHavingVarianceSampleInput
  variancePopulation: RepositoryRelationshipTypeHavingVariancePopulationInput
}

input RepositoryRelationshipTypeHavingSumInput {
  createdAt: HavingDatetimeFilter
}

input RepositoryRelationshipTypeHavingDistinctCountInput {
  createdAt: HavingDatetimeFilter
}

input RepositoryRelationshipTypeHavingMinInput {
  createdAt: HavingDatetimeFilter
}

input RepositoryRelationshipTypeHavingMaxInput {
  createdAt: HavingDatetimeFilter
}

input RepositoryRelationshipTypeHavingAverageInput {
  createdAt: HavingDatetimeFilter
}

input RepositoryRelationshipTypeHavingStddevSampleInput {
  createdAt: HavingDatetimeFilter
}

input RepositoryRelationshipTypeHavingStddevPopulationInput {
  createdAt: HavingDatetimeFilter
}

input RepositoryRelationshipTypeHavingVarianceSampleInput {
  createdAt: HavingDatetimeFilter
}

input RepositoryRelationshipTypeHavingVariancePopulationInput {
  createdAt: HavingDatetimeFilter
}

"""
A condition to be used against \`RepositoryRelationshipType\` object types. All
fields are tested for equality and combined with a logical ‘and.’
"""
input RepositoryRelationshipTypeCondition {
  """Checks for equality with the object’s \`rowId\` field."""
  rowId: UUID

  """Checks for equality with the object’s \`name\` field."""
  name: String

  """Checks for equality with the object’s \`description\` field."""
  description: String

  """Checks for equality with the object’s \`isDirected\` field."""
  isDirected: Boolean

  """Checks for equality with the object’s \`organizationId\` field."""
  organizationId: UUID

  """Checks for equality with the object’s \`createdAt\` field."""
  createdAt: Datetime
}

"""Methods to use when ordering \`RepositoryRelationshipType\`."""
enum RepositoryRelationshipTypeOrderBy {
  NATURAL
  PRIMARY_KEY_ASC
  PRIMARY_KEY_DESC
  ROW_ID_ASC
  ROW_ID_DESC
  NAME_ASC
  NAME_DESC
  DESCRIPTION_ASC
  DESCRIPTION_DESC
  IS_DIRECTED_ASC
  IS_DIRECTED_DESC
  ORGANIZATION_ID_ASC
  ORGANIZATION_ID_DESC
  CREATED_AT_ASC
  CREATED_AT_DESC
  REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_COUNT_ASC
  REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_COUNT_DESC
  REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_SUM_CONFIDENCE_ASC
  REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_SUM_CONFIDENCE_DESC
  REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_DISTINCT_COUNT_ROW_ID_ASC
  REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_DISTINCT_COUNT_ROW_ID_DESC
  REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_DISTINCT_COUNT_SOURCE_REPOSITORY_ID_ASC
  REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_DISTINCT_COUNT_SOURCE_REPOSITORY_ID_DESC
  REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_DISTINCT_COUNT_TARGET_REPOSITORY_ID_ASC
  REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_DISTINCT_COUNT_TARGET_REPOSITORY_ID_DESC
  REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_DISTINCT_COUNT_RELATIONSHIP_TYPE_ID_ASC
  REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_DISTINCT_COUNT_RELATIONSHIP_TYPE_ID_DESC
  REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_DISTINCT_COUNT_DETECTION_SOURCE_ASC
  REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_DISTINCT_COUNT_DETECTION_SOURCE_DESC
  REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_DISTINCT_COUNT_CONFIDENCE_ASC
  REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_DISTINCT_COUNT_CONFIDENCE_DESC
  REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_DISTINCT_COUNT_VERSION_CONSTRAINT_ASC
  REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_DISTINCT_COUNT_VERSION_CONSTRAINT_DESC
  REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_DISTINCT_COUNT_BRANCH_ASC
  REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_DISTINCT_COUNT_BRANCH_DESC
  REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_DISTINCT_COUNT_CREATED_AT_ASC
  REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_DISTINCT_COUNT_CREATED_AT_DESC
  REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_DISTINCT_COUNT_UPDATED_AT_ASC
  REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_DISTINCT_COUNT_UPDATED_AT_DESC
  REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_MIN_CONFIDENCE_ASC
  REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_MIN_CONFIDENCE_DESC
  REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_MAX_CONFIDENCE_ASC
  REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_MAX_CONFIDENCE_DESC
  REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_AVERAGE_CONFIDENCE_ASC
  REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_AVERAGE_CONFIDENCE_DESC
  REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_STDDEV_SAMPLE_CONFIDENCE_ASC
  REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_STDDEV_SAMPLE_CONFIDENCE_DESC
  REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_STDDEV_POPULATION_CONFIDENCE_ASC
  REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_STDDEV_POPULATION_CONFIDENCE_DESC
  REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_VARIANCE_SAMPLE_CONFIDENCE_ASC
  REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_VARIANCE_SAMPLE_CONFIDENCE_DESC
  REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_VARIANCE_POPULATION_CONFIDENCE_ASC
  REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_VARIANCE_POPULATION_CONFIDENCE_DESC
}

"""A connection to a list of \`RepositoryRelationshipMetadatum\` values."""
type RepositoryRelationshipMetadatumConnection {
  """A list of \`RepositoryRelationshipMetadatum\` objects."""
  nodes: [RepositoryRelationshipMetadatum!]!

  """
  A list of edges which contains the \`RepositoryRelationshipMetadatum\` and cursor to aid in pagination.
  """
  edges: [RepositoryRelationshipMetadatumEdge!]!

  """Information to aid in pagination."""
  pageInfo: PageInfo!

  """
  The count of *all* \`RepositoryRelationshipMetadatum\` you could get from the connection.
  """
  totalCount: Int!

  """
  Aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  aggregates: RepositoryRelationshipMetadatumAggregates

  """
  Grouped aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  groupedAggregates(
    """
    The method to use when grouping \`RepositoryRelationshipMetadatum\` for these aggregates.
    """
    groupBy: [RepositoryRelationshipMetadatumGroupBy!]!

    """Conditions on the grouped aggregates."""
    having: RepositoryRelationshipMetadatumHavingInput
  ): [RepositoryRelationshipMetadatumAggregates!]
}

"""A \`RepositoryRelationshipMetadatum\` edge in the connection."""
type RepositoryRelationshipMetadatumEdge {
  """A cursor for use in pagination."""
  cursor: Cursor

  """The \`RepositoryRelationshipMetadatum\` at the end of the edge."""
  node: RepositoryRelationshipMetadatum!
}

type RepositoryRelationshipMetadatumAggregates {
  keys: [String]

  """
  Distinct count aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  distinctCount: RepositoryRelationshipMetadatumDistinctCountAggregates
}

type RepositoryRelationshipMetadatumDistinctCountAggregates {
  """Distinct count of rowId across the matching connection"""
  rowId: BigInt

  """Distinct count of relationshipId across the matching connection"""
  relationshipId: BigInt

  """Distinct count of key across the matching connection"""
  key: BigInt

  """Distinct count of value across the matching connection"""
  value: BigInt

  """Distinct count of createdAt across the matching connection"""
  createdAt: BigInt
}

"""
Grouping methods for \`RepositoryRelationshipMetadatum\` for usage during aggregation.
"""
enum RepositoryRelationshipMetadatumGroupBy {
  RELATIONSHIP_ID
  KEY
  VALUE
  CREATED_AT
  CREATED_AT_TRUNCATED_TO_HOUR
  CREATED_AT_TRUNCATED_TO_DAY
}

"""Conditions for \`RepositoryRelationshipMetadatum\` aggregates."""
input RepositoryRelationshipMetadatumHavingInput {
  AND: [RepositoryRelationshipMetadatumHavingInput!]
  OR: [RepositoryRelationshipMetadatumHavingInput!]
  sum: RepositoryRelationshipMetadatumHavingSumInput
  distinctCount: RepositoryRelationshipMetadatumHavingDistinctCountInput
  min: RepositoryRelationshipMetadatumHavingMinInput
  max: RepositoryRelationshipMetadatumHavingMaxInput
  average: RepositoryRelationshipMetadatumHavingAverageInput
  stddevSample: RepositoryRelationshipMetadatumHavingStddevSampleInput
  stddevPopulation: RepositoryRelationshipMetadatumHavingStddevPopulationInput
  varianceSample: RepositoryRelationshipMetadatumHavingVarianceSampleInput
  variancePopulation: RepositoryRelationshipMetadatumHavingVariancePopulationInput
}

input RepositoryRelationshipMetadatumHavingSumInput {
  createdAt: HavingDatetimeFilter
}

input RepositoryRelationshipMetadatumHavingDistinctCountInput {
  createdAt: HavingDatetimeFilter
}

input RepositoryRelationshipMetadatumHavingMinInput {
  createdAt: HavingDatetimeFilter
}

input RepositoryRelationshipMetadatumHavingMaxInput {
  createdAt: HavingDatetimeFilter
}

input RepositoryRelationshipMetadatumHavingAverageInput {
  createdAt: HavingDatetimeFilter
}

input RepositoryRelationshipMetadatumHavingStddevSampleInput {
  createdAt: HavingDatetimeFilter
}

input RepositoryRelationshipMetadatumHavingStddevPopulationInput {
  createdAt: HavingDatetimeFilter
}

input RepositoryRelationshipMetadatumHavingVarianceSampleInput {
  createdAt: HavingDatetimeFilter
}

input RepositoryRelationshipMetadatumHavingVariancePopulationInput {
  createdAt: HavingDatetimeFilter
}

"""
A condition to be used against \`RepositoryRelationshipMetadatum\` object types.
All fields are tested for equality and combined with a logical ‘and.’
"""
input RepositoryRelationshipMetadatumCondition {
  """Checks for equality with the object’s \`rowId\` field."""
  rowId: UUID

  """Checks for equality with the object’s \`relationshipId\` field."""
  relationshipId: UUID

  """Checks for equality with the object’s \`key\` field."""
  key: String

  """Checks for equality with the object’s \`value\` field."""
  value: String

  """Checks for equality with the object’s \`createdAt\` field."""
  createdAt: Datetime
}

"""Methods to use when ordering \`RepositoryRelationshipMetadatum\`."""
enum RepositoryRelationshipMetadatumOrderBy {
  NATURAL
  PRIMARY_KEY_ASC
  PRIMARY_KEY_DESC
  ROW_ID_ASC
  ROW_ID_DESC
  RELATIONSHIP_ID_ASC
  RELATIONSHIP_ID_DESC
  KEY_ASC
  KEY_DESC
  VALUE_ASC
  VALUE_DESC
  CREATED_AT_ASC
  CREATED_AT_DESC
}

"""A connection to a list of \`User\` values."""
type UserConnection {
  """A list of \`User\` objects."""
  nodes: [User!]!

  """
  A list of edges which contains the \`User\` and cursor to aid in pagination.
  """
  edges: [UserEdge!]!

  """Information to aid in pagination."""
  pageInfo: PageInfo!

  """The count of *all* \`User\` you could get from the connection."""
  totalCount: Int!

  """
  Aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  aggregates: UserAggregates

  """
  Grouped aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  groupedAggregates(
    """The method to use when grouping \`User\` for these aggregates."""
    groupBy: [UserGroupBy!]!

    """Conditions on the grouped aggregates."""
    having: UserHavingInput
  ): [UserAggregates!]
}

"""A \`User\` edge in the connection."""
type UserEdge {
  """A cursor for use in pagination."""
  cursor: Cursor

  """The \`User\` at the end of the edge."""
  node: User!
}

type UserAggregates {
  keys: [String]

  """
  Distinct count aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  distinctCount: UserDistinctCountAggregates
}

type UserDistinctCountAggregates {
  """Distinct count of rowId across the matching connection"""
  rowId: BigInt

  """Distinct count of identityProviderId across the matching connection"""
  identityProviderId: BigInt

  """Distinct count of name across the matching connection"""
  name: BigInt

  """Distinct count of avatarUrl across the matching connection"""
  avatarUrl: BigInt

  """Distinct count of email across the matching connection"""
  email: BigInt

  """Distinct count of createdAt across the matching connection"""
  createdAt: BigInt

  """Distinct count of updatedAt across the matching connection"""
  updatedAt: BigInt

  """Distinct count of username across the matching connection"""
  username: BigInt

  """Distinct count of bio across the matching connection"""
  bio: BigInt
}

"""Grouping methods for \`User\` for usage during aggregation."""
enum UserGroupBy {
  NAME
  AVATAR_URL
  CREATED_AT
  CREATED_AT_TRUNCATED_TO_HOUR
  CREATED_AT_TRUNCATED_TO_DAY
  UPDATED_AT
  UPDATED_AT_TRUNCATED_TO_HOUR
  UPDATED_AT_TRUNCATED_TO_DAY
  BIO
}

"""Conditions for \`User\` aggregates."""
input UserHavingInput {
  AND: [UserHavingInput!]
  OR: [UserHavingInput!]
  sum: UserHavingSumInput
  distinctCount: UserHavingDistinctCountInput
  min: UserHavingMinInput
  max: UserHavingMaxInput
  average: UserHavingAverageInput
  stddevSample: UserHavingStddevSampleInput
  stddevPopulation: UserHavingStddevPopulationInput
  varianceSample: UserHavingVarianceSampleInput
  variancePopulation: UserHavingVariancePopulationInput
}

input UserHavingSumInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input UserHavingDistinctCountInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input UserHavingMinInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input UserHavingMaxInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input UserHavingAverageInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input UserHavingStddevSampleInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input UserHavingStddevPopulationInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input UserHavingVarianceSampleInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input UserHavingVariancePopulationInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

"""
A condition to be used against \`User\` object types. All fields are tested for equality and combined with a logical ‘and.’
"""
input UserCondition {
  """Checks for equality with the object’s \`rowId\` field."""
  rowId: UUID

  """Checks for equality with the object’s \`identityProviderId\` field."""
  identityProviderId: UUID

  """Checks for equality with the object’s \`name\` field."""
  name: String

  """Checks for equality with the object’s \`avatarUrl\` field."""
  avatarUrl: String

  """Checks for equality with the object’s \`email\` field."""
  email: String

  """Checks for equality with the object’s \`createdAt\` field."""
  createdAt: Datetime

  """Checks for equality with the object’s \`updatedAt\` field."""
  updatedAt: Datetime

  """Checks for equality with the object’s \`username\` field."""
  username: String

  """Checks for equality with the object’s \`bio\` field."""
  bio: String
}

"""Methods to use when ordering \`User\`."""
enum UserOrderBy {
  NATURAL
  PRIMARY_KEY_ASC
  PRIMARY_KEY_DESC
  ROW_ID_ASC
  ROW_ID_DESC
  IDENTITY_PROVIDER_ID_ASC
  IDENTITY_PROVIDER_ID_DESC
  NAME_ASC
  NAME_DESC
  AVATAR_URL_ASC
  AVATAR_URL_DESC
  EMAIL_ASC
  EMAIL_DESC
  CREATED_AT_ASC
  CREATED_AT_DESC
  UPDATED_AT_ASC
  UPDATED_AT_DESC
  USERNAME_ASC
  USERNAME_DESC
  BIO_ASC
  BIO_DESC
  REPOSITORIES_BY_OWNER_ID_COUNT_ASC
  REPOSITORIES_BY_OWNER_ID_COUNT_DESC
  REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_ROW_ID_ASC
  REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_ROW_ID_DESC
  REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_OWNER_ID_ASC
  REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_OWNER_ID_DESC
  REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_ORGANIZATION_ID_ASC
  REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_ORGANIZATION_ID_DESC
  REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_NAME_ASC
  REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_NAME_DESC
  REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_SLUG_ASC
  REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_SLUG_DESC
  REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_DESCRIPTION_ASC
  REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_DESCRIPTION_DESC
  REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_VISIBILITY_ASC
  REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_VISIBILITY_DESC
  REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_DEFAULT_BRANCH_ASC
  REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_DEFAULT_BRANCH_DESC
  REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_CREATED_AT_ASC
  REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_CREATED_AT_DESC
  REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_UPDATED_AT_ASC
  REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_UPDATED_AT_DESC
  REPOSITORY_COLLABORATORS_COUNT_ASC
  REPOSITORY_COLLABORATORS_COUNT_DESC
  REPOSITORY_COLLABORATORS_DISTINCT_COUNT_REPOSITORY_ID_ASC
  REPOSITORY_COLLABORATORS_DISTINCT_COUNT_REPOSITORY_ID_DESC
  REPOSITORY_COLLABORATORS_DISTINCT_COUNT_USER_ID_ASC
  REPOSITORY_COLLABORATORS_DISTINCT_COUNT_USER_ID_DESC
  REPOSITORY_COLLABORATORS_DISTINCT_COUNT_PERMISSION_ASC
  REPOSITORY_COLLABORATORS_DISTINCT_COUNT_PERMISSION_DESC
  REPOSITORY_COLLABORATORS_DISTINCT_COUNT_CREATED_AT_ASC
  REPOSITORY_COLLABORATORS_DISTINCT_COUNT_CREATED_AT_DESC
  REPOSITORY_COLLABORATORS_DISTINCT_COUNT_UPDATED_AT_ASC
  REPOSITORY_COLLABORATORS_DISTINCT_COUNT_UPDATED_AT_DESC
  AUTHORED_PULL_REQUEST_COMMENTS_COUNT_ASC
  AUTHORED_PULL_REQUEST_COMMENTS_COUNT_DESC
  AUTHORED_PULL_REQUEST_COMMENTS_SUM_LINE_ASC
  AUTHORED_PULL_REQUEST_COMMENTS_SUM_LINE_DESC
  AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_ROW_ID_ASC
  AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_ROW_ID_DESC
  AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_PULL_REQUEST_ID_ASC
  AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_PULL_REQUEST_ID_DESC
  AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_AUTHOR_ID_ASC
  AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_AUTHOR_ID_DESC
  AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_BODY_ASC
  AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_BODY_DESC
  AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_PATH_ASC
  AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_PATH_DESC
  AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_LINE_ASC
  AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_LINE_DESC
  AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_SIDE_ASC
  AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_SIDE_DESC
  AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_COMMIT_SHA_ASC
  AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_COMMIT_SHA_DESC
  AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_REPLY_TO_ID_ASC
  AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_REPLY_TO_ID_DESC
  AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_CREATED_AT_ASC
  AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_CREATED_AT_DESC
  AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_UPDATED_AT_ASC
  AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_UPDATED_AT_DESC
  AUTHORED_PULL_REQUEST_COMMENTS_MIN_LINE_ASC
  AUTHORED_PULL_REQUEST_COMMENTS_MIN_LINE_DESC
  AUTHORED_PULL_REQUEST_COMMENTS_MAX_LINE_ASC
  AUTHORED_PULL_REQUEST_COMMENTS_MAX_LINE_DESC
  AUTHORED_PULL_REQUEST_COMMENTS_AVERAGE_LINE_ASC
  AUTHORED_PULL_REQUEST_COMMENTS_AVERAGE_LINE_DESC
  AUTHORED_PULL_REQUEST_COMMENTS_STDDEV_SAMPLE_LINE_ASC
  AUTHORED_PULL_REQUEST_COMMENTS_STDDEV_SAMPLE_LINE_DESC
  AUTHORED_PULL_REQUEST_COMMENTS_STDDEV_POPULATION_LINE_ASC
  AUTHORED_PULL_REQUEST_COMMENTS_STDDEV_POPULATION_LINE_DESC
  AUTHORED_PULL_REQUEST_COMMENTS_VARIANCE_SAMPLE_LINE_ASC
  AUTHORED_PULL_REQUEST_COMMENTS_VARIANCE_SAMPLE_LINE_DESC
  AUTHORED_PULL_REQUEST_COMMENTS_VARIANCE_POPULATION_LINE_ASC
  AUTHORED_PULL_REQUEST_COMMENTS_VARIANCE_POPULATION_LINE_DESC
  REVIEWED_PULL_REQUEST_REVIEWS_COUNT_ASC
  REVIEWED_PULL_REQUEST_REVIEWS_COUNT_DESC
  REVIEWED_PULL_REQUEST_REVIEWS_DISTINCT_COUNT_ROW_ID_ASC
  REVIEWED_PULL_REQUEST_REVIEWS_DISTINCT_COUNT_ROW_ID_DESC
  REVIEWED_PULL_REQUEST_REVIEWS_DISTINCT_COUNT_PULL_REQUEST_ID_ASC
  REVIEWED_PULL_REQUEST_REVIEWS_DISTINCT_COUNT_PULL_REQUEST_ID_DESC
  REVIEWED_PULL_REQUEST_REVIEWS_DISTINCT_COUNT_REVIEWER_ID_ASC
  REVIEWED_PULL_REQUEST_REVIEWS_DISTINCT_COUNT_REVIEWER_ID_DESC
  REVIEWED_PULL_REQUEST_REVIEWS_DISTINCT_COUNT_STATE_ASC
  REVIEWED_PULL_REQUEST_REVIEWS_DISTINCT_COUNT_STATE_DESC
  REVIEWED_PULL_REQUEST_REVIEWS_DISTINCT_COUNT_BODY_ASC
  REVIEWED_PULL_REQUEST_REVIEWS_DISTINCT_COUNT_BODY_DESC
  REVIEWED_PULL_REQUEST_REVIEWS_DISTINCT_COUNT_SUBMITTED_AT_ASC
  REVIEWED_PULL_REQUEST_REVIEWS_DISTINCT_COUNT_SUBMITTED_AT_DESC
  REVIEWED_PULL_REQUEST_REVIEWS_DISTINCT_COUNT_CREATED_AT_ASC
  REVIEWED_PULL_REQUEST_REVIEWS_DISTINCT_COUNT_CREATED_AT_DESC
  REVIEWED_PULL_REQUEST_REVIEWS_DISTINCT_COUNT_UPDATED_AT_ASC
  REVIEWED_PULL_REQUEST_REVIEWS_DISTINCT_COUNT_UPDATED_AT_DESC
  AUTHORED_PULL_REQUESTS_COUNT_ASC
  AUTHORED_PULL_REQUESTS_COUNT_DESC
  AUTHORED_PULL_REQUESTS_SUM_NUMBER_ASC
  AUTHORED_PULL_REQUESTS_SUM_NUMBER_DESC
  AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_ROW_ID_ASC
  AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_ROW_ID_DESC
  AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_NUMBER_ASC
  AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_NUMBER_DESC
  AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_REPOSITORY_ID_ASC
  AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_REPOSITORY_ID_DESC
  AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_AUTHOR_ID_ASC
  AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_AUTHOR_ID_DESC
  AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_TITLE_ASC
  AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_TITLE_DESC
  AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_DESCRIPTION_ASC
  AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_DESCRIPTION_DESC
  AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_STATE_ASC
  AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_STATE_DESC
  AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_SOURCE_BRANCH_ASC
  AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_SOURCE_BRANCH_DESC
  AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_TARGET_BRANCH_ASC
  AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_TARGET_BRANCH_DESC
  AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_MERGE_COMMIT_SHA_ASC
  AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_MERGE_COMMIT_SHA_DESC
  AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_MERGED_AT_ASC
  AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_MERGED_AT_DESC
  AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_MERGED_BY_ID_ASC
  AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_MERGED_BY_ID_DESC
  AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_CLOSED_AT_ASC
  AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_CLOSED_AT_DESC
  AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_CREATED_AT_ASC
  AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_CREATED_AT_DESC
  AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_UPDATED_AT_ASC
  AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_UPDATED_AT_DESC
  AUTHORED_PULL_REQUESTS_MIN_NUMBER_ASC
  AUTHORED_PULL_REQUESTS_MIN_NUMBER_DESC
  AUTHORED_PULL_REQUESTS_MAX_NUMBER_ASC
  AUTHORED_PULL_REQUESTS_MAX_NUMBER_DESC
  AUTHORED_PULL_REQUESTS_AVERAGE_NUMBER_ASC
  AUTHORED_PULL_REQUESTS_AVERAGE_NUMBER_DESC
  AUTHORED_PULL_REQUESTS_STDDEV_SAMPLE_NUMBER_ASC
  AUTHORED_PULL_REQUESTS_STDDEV_SAMPLE_NUMBER_DESC
  AUTHORED_PULL_REQUESTS_STDDEV_POPULATION_NUMBER_ASC
  AUTHORED_PULL_REQUESTS_STDDEV_POPULATION_NUMBER_DESC
  AUTHORED_PULL_REQUESTS_VARIANCE_SAMPLE_NUMBER_ASC
  AUTHORED_PULL_REQUESTS_VARIANCE_SAMPLE_NUMBER_DESC
  AUTHORED_PULL_REQUESTS_VARIANCE_POPULATION_NUMBER_ASC
  AUTHORED_PULL_REQUESTS_VARIANCE_POPULATION_NUMBER_DESC
  PULL_REQUESTS_BY_MERGED_BY_ID_COUNT_ASC
  PULL_REQUESTS_BY_MERGED_BY_ID_COUNT_DESC
  PULL_REQUESTS_BY_MERGED_BY_ID_SUM_NUMBER_ASC
  PULL_REQUESTS_BY_MERGED_BY_ID_SUM_NUMBER_DESC
  PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_ROW_ID_ASC
  PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_ROW_ID_DESC
  PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_NUMBER_ASC
  PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_NUMBER_DESC
  PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_REPOSITORY_ID_ASC
  PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_REPOSITORY_ID_DESC
  PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_AUTHOR_ID_ASC
  PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_AUTHOR_ID_DESC
  PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_TITLE_ASC
  PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_TITLE_DESC
  PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_DESCRIPTION_ASC
  PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_DESCRIPTION_DESC
  PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_STATE_ASC
  PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_STATE_DESC
  PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_SOURCE_BRANCH_ASC
  PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_SOURCE_BRANCH_DESC
  PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_TARGET_BRANCH_ASC
  PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_TARGET_BRANCH_DESC
  PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_MERGE_COMMIT_SHA_ASC
  PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_MERGE_COMMIT_SHA_DESC
  PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_MERGED_AT_ASC
  PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_MERGED_AT_DESC
  PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_MERGED_BY_ID_ASC
  PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_MERGED_BY_ID_DESC
  PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_CLOSED_AT_ASC
  PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_CLOSED_AT_DESC
  PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_CREATED_AT_ASC
  PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_CREATED_AT_DESC
  PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_UPDATED_AT_ASC
  PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_UPDATED_AT_DESC
  PULL_REQUESTS_BY_MERGED_BY_ID_MIN_NUMBER_ASC
  PULL_REQUESTS_BY_MERGED_BY_ID_MIN_NUMBER_DESC
  PULL_REQUESTS_BY_MERGED_BY_ID_MAX_NUMBER_ASC
  PULL_REQUESTS_BY_MERGED_BY_ID_MAX_NUMBER_DESC
  PULL_REQUESTS_BY_MERGED_BY_ID_AVERAGE_NUMBER_ASC
  PULL_REQUESTS_BY_MERGED_BY_ID_AVERAGE_NUMBER_DESC
  PULL_REQUESTS_BY_MERGED_BY_ID_STDDEV_SAMPLE_NUMBER_ASC
  PULL_REQUESTS_BY_MERGED_BY_ID_STDDEV_SAMPLE_NUMBER_DESC
  PULL_REQUESTS_BY_MERGED_BY_ID_STDDEV_POPULATION_NUMBER_ASC
  PULL_REQUESTS_BY_MERGED_BY_ID_STDDEV_POPULATION_NUMBER_DESC
  PULL_REQUESTS_BY_MERGED_BY_ID_VARIANCE_SAMPLE_NUMBER_ASC
  PULL_REQUESTS_BY_MERGED_BY_ID_VARIANCE_SAMPLE_NUMBER_DESC
  PULL_REQUESTS_BY_MERGED_BY_ID_VARIANCE_POPULATION_NUMBER_ASC
  PULL_REQUESTS_BY_MERGED_BY_ID_VARIANCE_POPULATION_NUMBER_DESC
}

"""A connection to a list of \`Organization\` values."""
type OrganizationConnection {
  """A list of \`Organization\` objects."""
  nodes: [Organization!]!

  """
  A list of edges which contains the \`Organization\` and cursor to aid in pagination.
  """
  edges: [OrganizationEdge!]!

  """Information to aid in pagination."""
  pageInfo: PageInfo!

  """The count of *all* \`Organization\` you could get from the connection."""
  totalCount: Int!

  """
  Aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  aggregates: OrganizationAggregates

  """
  Grouped aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  groupedAggregates(
    """The method to use when grouping \`Organization\` for these aggregates."""
    groupBy: [OrganizationGroupBy!]!

    """Conditions on the grouped aggregates."""
    having: OrganizationHavingInput
  ): [OrganizationAggregates!]
}

"""A \`Organization\` edge in the connection."""
type OrganizationEdge {
  """A cursor for use in pagination."""
  cursor: Cursor

  """The \`Organization\` at the end of the edge."""
  node: Organization!
}

type OrganizationAggregates {
  keys: [String]

  """
  Distinct count aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  distinctCount: OrganizationDistinctCountAggregates
}

type OrganizationDistinctCountAggregates {
  """Distinct count of rowId across the matching connection"""
  rowId: BigInt

  """Distinct count of description across the matching connection"""
  description: BigInt

  """Distinct count of avatarUrl across the matching connection"""
  avatarUrl: BigInt

  """Distinct count of createdAt across the matching connection"""
  createdAt: BigInt

  """Distinct count of updatedAt across the matching connection"""
  updatedAt: BigInt

  """Distinct count of idpOrganizationId across the matching connection"""
  idpOrganizationId: BigInt

  """Distinct count of subscriptionId across the matching connection"""
  subscriptionId: BigInt

  """Distinct count of billingAccountId across the matching connection"""
  billingAccountId: BigInt

  """Distinct count of deletedAt across the matching connection"""
  deletedAt: BigInt

  """Distinct count of deletionReason across the matching connection"""
  deletionReason: BigInt
}

"""Grouping methods for \`Organization\` for usage during aggregation."""
enum OrganizationGroupBy {
  DESCRIPTION
  AVATAR_URL
  CREATED_AT
  CREATED_AT_TRUNCATED_TO_HOUR
  CREATED_AT_TRUNCATED_TO_DAY
  UPDATED_AT
  UPDATED_AT_TRUNCATED_TO_HOUR
  UPDATED_AT_TRUNCATED_TO_DAY
  SUBSCRIPTION_ID
  BILLING_ACCOUNT_ID
  DELETED_AT
  DELETED_AT_TRUNCATED_TO_HOUR
  DELETED_AT_TRUNCATED_TO_DAY
  DELETION_REASON
}

"""Conditions for \`Organization\` aggregates."""
input OrganizationHavingInput {
  AND: [OrganizationHavingInput!]
  OR: [OrganizationHavingInput!]
  sum: OrganizationHavingSumInput
  distinctCount: OrganizationHavingDistinctCountInput
  min: OrganizationHavingMinInput
  max: OrganizationHavingMaxInput
  average: OrganizationHavingAverageInput
  stddevSample: OrganizationHavingStddevSampleInput
  stddevPopulation: OrganizationHavingStddevPopulationInput
  varianceSample: OrganizationHavingVarianceSampleInput
  variancePopulation: OrganizationHavingVariancePopulationInput
}

input OrganizationHavingSumInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
  deletedAt: HavingDatetimeFilter
}

input OrganizationHavingDistinctCountInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
  deletedAt: HavingDatetimeFilter
}

input OrganizationHavingMinInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
  deletedAt: HavingDatetimeFilter
}

input OrganizationHavingMaxInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
  deletedAt: HavingDatetimeFilter
}

input OrganizationHavingAverageInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
  deletedAt: HavingDatetimeFilter
}

input OrganizationHavingStddevSampleInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
  deletedAt: HavingDatetimeFilter
}

input OrganizationHavingStddevPopulationInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
  deletedAt: HavingDatetimeFilter
}

input OrganizationHavingVarianceSampleInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
  deletedAt: HavingDatetimeFilter
}

input OrganizationHavingVariancePopulationInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
  deletedAt: HavingDatetimeFilter
}

"""
A condition to be used against \`Organization\` object types. All fields are
tested for equality and combined with a logical ‘and.’
"""
input OrganizationCondition {
  """Checks for equality with the object’s \`rowId\` field."""
  rowId: UUID

  """Checks for equality with the object’s \`description\` field."""
  description: String

  """Checks for equality with the object’s \`avatarUrl\` field."""
  avatarUrl: String

  """Checks for equality with the object’s \`createdAt\` field."""
  createdAt: Datetime

  """Checks for equality with the object’s \`updatedAt\` field."""
  updatedAt: Datetime

  """Checks for equality with the object’s \`idpOrganizationId\` field."""
  idpOrganizationId: String

  """Checks for equality with the object’s \`subscriptionId\` field."""
  subscriptionId: String

  """Checks for equality with the object’s \`billingAccountId\` field."""
  billingAccountId: String

  """Checks for equality with the object’s \`deletedAt\` field."""
  deletedAt: Datetime

  """Checks for equality with the object’s \`deletionReason\` field."""
  deletionReason: String
}

"""Methods to use when ordering \`Organization\`."""
enum OrganizationOrderBy {
  NATURAL
  PRIMARY_KEY_ASC
  PRIMARY_KEY_DESC
  ROW_ID_ASC
  ROW_ID_DESC
  DESCRIPTION_ASC
  DESCRIPTION_DESC
  AVATAR_URL_ASC
  AVATAR_URL_DESC
  CREATED_AT_ASC
  CREATED_AT_DESC
  UPDATED_AT_ASC
  UPDATED_AT_DESC
  IDP_ORGANIZATION_ID_ASC
  IDP_ORGANIZATION_ID_DESC
  SUBSCRIPTION_ID_ASC
  SUBSCRIPTION_ID_DESC
  BILLING_ACCOUNT_ID_ASC
  BILLING_ACCOUNT_ID_DESC
  DELETED_AT_ASC
  DELETED_AT_DESC
  DELETION_REASON_ASC
  DELETION_REASON_DESC
  REPOSITORIES_COUNT_ASC
  REPOSITORIES_COUNT_DESC
  REPOSITORIES_DISTINCT_COUNT_ROW_ID_ASC
  REPOSITORIES_DISTINCT_COUNT_ROW_ID_DESC
  REPOSITORIES_DISTINCT_COUNT_OWNER_ID_ASC
  REPOSITORIES_DISTINCT_COUNT_OWNER_ID_DESC
  REPOSITORIES_DISTINCT_COUNT_ORGANIZATION_ID_ASC
  REPOSITORIES_DISTINCT_COUNT_ORGANIZATION_ID_DESC
  REPOSITORIES_DISTINCT_COUNT_NAME_ASC
  REPOSITORIES_DISTINCT_COUNT_NAME_DESC
  REPOSITORIES_DISTINCT_COUNT_SLUG_ASC
  REPOSITORIES_DISTINCT_COUNT_SLUG_DESC
  REPOSITORIES_DISTINCT_COUNT_DESCRIPTION_ASC
  REPOSITORIES_DISTINCT_COUNT_DESCRIPTION_DESC
  REPOSITORIES_DISTINCT_COUNT_VISIBILITY_ASC
  REPOSITORIES_DISTINCT_COUNT_VISIBILITY_DESC
  REPOSITORIES_DISTINCT_COUNT_DEFAULT_BRANCH_ASC
  REPOSITORIES_DISTINCT_COUNT_DEFAULT_BRANCH_DESC
  REPOSITORIES_DISTINCT_COUNT_CREATED_AT_ASC
  REPOSITORIES_DISTINCT_COUNT_CREATED_AT_DESC
  REPOSITORIES_DISTINCT_COUNT_UPDATED_AT_ASC
  REPOSITORIES_DISTINCT_COUNT_UPDATED_AT_DESC
  REPOSITORY_RELATIONSHIP_TYPES_COUNT_ASC
  REPOSITORY_RELATIONSHIP_TYPES_COUNT_DESC
  REPOSITORY_RELATIONSHIP_TYPES_DISTINCT_COUNT_ROW_ID_ASC
  REPOSITORY_RELATIONSHIP_TYPES_DISTINCT_COUNT_ROW_ID_DESC
  REPOSITORY_RELATIONSHIP_TYPES_DISTINCT_COUNT_NAME_ASC
  REPOSITORY_RELATIONSHIP_TYPES_DISTINCT_COUNT_NAME_DESC
  REPOSITORY_RELATIONSHIP_TYPES_DISTINCT_COUNT_DESCRIPTION_ASC
  REPOSITORY_RELATIONSHIP_TYPES_DISTINCT_COUNT_DESCRIPTION_DESC
  REPOSITORY_RELATIONSHIP_TYPES_DISTINCT_COUNT_IS_DIRECTED_ASC
  REPOSITORY_RELATIONSHIP_TYPES_DISTINCT_COUNT_IS_DIRECTED_DESC
  REPOSITORY_RELATIONSHIP_TYPES_DISTINCT_COUNT_ORGANIZATION_ID_ASC
  REPOSITORY_RELATIONSHIP_TYPES_DISTINCT_COUNT_ORGANIZATION_ID_DESC
  REPOSITORY_RELATIONSHIP_TYPES_DISTINCT_COUNT_CREATED_AT_ASC
  REPOSITORY_RELATIONSHIP_TYPES_DISTINCT_COUNT_CREATED_AT_DESC
}

"""The output of our create \`RepositoryRelationshipMetadatum\` mutation."""
type CreateRepositoryRelationshipMetadatumPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """
  The \`RepositoryRelationshipMetadatum\` that was created by this mutation.
  """
  repositoryRelationshipMetadatum: RepositoryRelationshipMetadatum

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """
  An edge for our \`RepositoryRelationshipMetadatum\`. May be used by Relay 1.
  """
  repositoryRelationshipMetadatumEdge(
    """The method to use when ordering \`RepositoryRelationshipMetadatum\`."""
    orderBy: [RepositoryRelationshipMetadatumOrderBy!]! = [PRIMARY_KEY_ASC]
  ): RepositoryRelationshipMetadatumEdge
}

"""All input for the create \`RepositoryRelationshipMetadatum\` mutation."""
input CreateRepositoryRelationshipMetadatumInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """The \`RepositoryRelationshipMetadatum\` to be created by this mutation."""
  repositoryRelationshipMetadatum: RepositoryRelationshipMetadatumInput!
}

"""An input for mutations affecting \`RepositoryRelationshipMetadatum\`"""
input RepositoryRelationshipMetadatumInput {
  rowId: UUID
  relationshipId: UUID!
  key: String!
  value: String!
  createdAt: Datetime
}

"""The output of our create \`ExternalDependency\` mutation."""
type CreateExternalDependencyPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`ExternalDependency\` that was created by this mutation."""
  externalDependency: ExternalDependency

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`ExternalDependency\`. May be used by Relay 1."""
  externalDependencyEdge(
    """The method to use when ordering \`ExternalDependency\`."""
    orderBy: [ExternalDependencyOrderBy!]! = [PRIMARY_KEY_ASC]
  ): ExternalDependencyEdge
}

"""All input for the create \`ExternalDependency\` mutation."""
input CreateExternalDependencyInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """The \`ExternalDependency\` to be created by this mutation."""
  externalDependency: ExternalDependencyInput!
}

"""An input for mutations affecting \`ExternalDependency\`"""
input ExternalDependencyInput {
  rowId: UUID
  repositoryId: UUID!
  packageManager: String!
  packageName: String!
  versionConstraint: String
  detectionSource: String
  createdAt: Datetime
}

"""The output of our create \`RepositoryCollaborator\` mutation."""
type CreateRepositoryCollaboratorPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`RepositoryCollaborator\` that was created by this mutation."""
  repositoryCollaborator: RepositoryCollaborator

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`RepositoryCollaborator\`. May be used by Relay 1."""
  repositoryCollaboratorEdge(
    """The method to use when ordering \`RepositoryCollaborator\`."""
    orderBy: [RepositoryCollaboratorOrderBy!]! = [PRIMARY_KEY_ASC]
  ): RepositoryCollaboratorEdge
}

"""All input for the create \`RepositoryCollaborator\` mutation."""
input CreateRepositoryCollaboratorInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """The \`RepositoryCollaborator\` to be created by this mutation."""
  repositoryCollaborator: RepositoryCollaboratorInput!
}

"""An input for mutations affecting \`RepositoryCollaborator\`"""
input RepositoryCollaboratorInput {
  repositoryId: UUID!
  userId: UUID!
  permission: Permission
  createdAt: Datetime
  updatedAt: Datetime
}

"""The output of our create \`RepositoryRelationshipType\` mutation."""
type CreateRepositoryRelationshipTypePayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`RepositoryRelationshipType\` that was created by this mutation."""
  repositoryRelationshipType: RepositoryRelationshipType

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`RepositoryRelationshipType\`. May be used by Relay 1."""
  repositoryRelationshipTypeEdge(
    """The method to use when ordering \`RepositoryRelationshipType\`."""
    orderBy: [RepositoryRelationshipTypeOrderBy!]! = [PRIMARY_KEY_ASC]
  ): RepositoryRelationshipTypeEdge
}

"""All input for the create \`RepositoryRelationshipType\` mutation."""
input CreateRepositoryRelationshipTypeInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """The \`RepositoryRelationshipType\` to be created by this mutation."""
  repositoryRelationshipType: RepositoryRelationshipTypeInput!
}

"""An input for mutations affecting \`RepositoryRelationshipType\`"""
input RepositoryRelationshipTypeInput {
  rowId: UUID
  name: String!
  description: String
  isDirected: Boolean
  organizationId: UUID
  createdAt: Datetime
}

"""The output of our create \`PullRequestReview\` mutation."""
type CreatePullRequestReviewPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`PullRequestReview\` that was created by this mutation."""
  pullRequestReview: PullRequestReview

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`PullRequestReview\`. May be used by Relay 1."""
  pullRequestReviewEdge(
    """The method to use when ordering \`PullRequestReview\`."""
    orderBy: [PullRequestReviewOrderBy!]! = [PRIMARY_KEY_ASC]
  ): PullRequestReviewEdge
}

"""All input for the create \`PullRequestReview\` mutation."""
input CreatePullRequestReviewInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """The \`PullRequestReview\` to be created by this mutation."""
  pullRequestReview: PullRequestReviewInput!
}

"""An input for mutations affecting \`PullRequestReview\`"""
input PullRequestReviewInput {
  rowId: UUID
  pullRequestId: UUID!
  reviewerId: UUID!
  state: String
  body: String
  submittedAt: Datetime
  createdAt: Datetime
  updatedAt: Datetime
}

"""The output of our create \`User\` mutation."""
type CreateUserPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`User\` that was created by this mutation."""
  user: User

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`User\`. May be used by Relay 1."""
  userEdge(
    """The method to use when ordering \`User\`."""
    orderBy: [UserOrderBy!]! = [PRIMARY_KEY_ASC]
  ): UserEdge
}

"""All input for the create \`User\` mutation."""
input CreateUserInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """The \`User\` to be created by this mutation."""
  user: UserInput!
}

"""An input for mutations affecting \`User\`"""
input UserInput {
  rowId: UUID
  identityProviderId: UUID!
  name: String!
  avatarUrl: String
  email: String!
  createdAt: Datetime
  updatedAt: Datetime
  username: String!
  bio: String
}

"""The output of our create \`PullRequestComment\` mutation."""
type CreatePullRequestCommentPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`PullRequestComment\` that was created by this mutation."""
  pullRequestComment: PullRequestComment

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`PullRequestComment\`. May be used by Relay 1."""
  pullRequestCommentEdge(
    """The method to use when ordering \`PullRequestComment\`."""
    orderBy: [PullRequestCommentOrderBy!]! = [PRIMARY_KEY_ASC]
  ): PullRequestCommentEdge
}

"""All input for the create \`PullRequestComment\` mutation."""
input CreatePullRequestCommentInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """The \`PullRequestComment\` to be created by this mutation."""
  pullRequestComment: PullRequestCommentInput!
}

"""An input for mutations affecting \`PullRequestComment\`"""
input PullRequestCommentInput {
  rowId: UUID
  pullRequestId: UUID!
  authorId: UUID!
  body: String!
  path: String
  line: Int
  side: String
  commitSha: String
  replyToId: UUID
  createdAt: Datetime
  updatedAt: Datetime
}

"""The output of our create \`RepositoryRelationship\` mutation."""
type CreateRepositoryRelationshipPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`RepositoryRelationship\` that was created by this mutation."""
  repositoryRelationship: RepositoryRelationship

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`RepositoryRelationship\`. May be used by Relay 1."""
  repositoryRelationshipEdge(
    """The method to use when ordering \`RepositoryRelationship\`."""
    orderBy: [RepositoryRelationshipOrderBy!]! = [PRIMARY_KEY_ASC]
  ): RepositoryRelationshipEdge
}

"""All input for the create \`RepositoryRelationship\` mutation."""
input CreateRepositoryRelationshipInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """The \`RepositoryRelationship\` to be created by this mutation."""
  repositoryRelationship: RepositoryRelationshipInput!
}

"""An input for mutations affecting \`RepositoryRelationship\`"""
input RepositoryRelationshipInput {
  rowId: UUID
  sourceRepositoryId: UUID!
  targetRepositoryId: UUID!
  relationshipTypeId: UUID!
  detectionSource: String
  confidence: Float
  versionConstraint: String
  branch: String
  createdAt: Datetime
  updatedAt: Datetime
}

"""The output of our create \`Organization\` mutation."""
type CreateOrganizationPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`Organization\` that was created by this mutation."""
  organization: Organization

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`Organization\`. May be used by Relay 1."""
  organizationEdge(
    """The method to use when ordering \`Organization\`."""
    orderBy: [OrganizationOrderBy!]! = [PRIMARY_KEY_ASC]
  ): OrganizationEdge
}

"""All input for the create \`Organization\` mutation."""
input CreateOrganizationInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """The \`Organization\` to be created by this mutation."""
  organization: OrganizationInput!
}

"""An input for mutations affecting \`Organization\`"""
input OrganizationInput {
  rowId: UUID
  description: String
  avatarUrl: String
  createdAt: Datetime
  updatedAt: Datetime
  idpOrganizationId: String!
  subscriptionId: String
  billingAccountId: String
  deletedAt: Datetime
  deletionReason: String
}

"""The output of our create \`Repository\` mutation."""
type CreateRepositoryPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`Repository\` that was created by this mutation."""
  repository: Repository

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`Repository\`. May be used by Relay 1."""
  repositoryEdge(
    """The method to use when ordering \`Repository\`."""
    orderBy: [RepositoryOrderBy!]! = [PRIMARY_KEY_ASC]
  ): RepositoryEdge
}

"""All input for the create \`Repository\` mutation."""
input CreateRepositoryInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """The \`Repository\` to be created by this mutation."""
  repository: RepositoryInput!
}

"""An input for mutations affecting \`Repository\`"""
input RepositoryInput {
  rowId: UUID
  ownerId: UUID!
  organizationId: UUID
  name: String!
  slug: String!
  description: String
  visibility: Visibility
  defaultBranch: String
  createdAt: Datetime
  updatedAt: Datetime
}

"""The output of our create \`PullRequest\` mutation."""
type CreatePullRequestPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`PullRequest\` that was created by this mutation."""
  pullRequest: PullRequest

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`PullRequest\`. May be used by Relay 1."""
  pullRequestEdge(
    """The method to use when ordering \`PullRequest\`."""
    orderBy: [PullRequestOrderBy!]! = [PRIMARY_KEY_ASC]
  ): PullRequestEdge
}

"""All input for the create \`PullRequest\` mutation."""
input CreatePullRequestInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """The \`PullRequest\` to be created by this mutation."""
  pullRequest: PullRequestInput!
}

"""An input for mutations affecting \`PullRequest\`"""
input PullRequestInput {
  rowId: UUID
  number: Int!
  repositoryId: UUID!
  authorId: UUID!
  title: String!
  description: String
  state: String
  sourceBranch: String!
  targetBranch: String!
  mergeCommitSha: String
  mergedAt: Datetime
  mergedById: UUID
  closedAt: Datetime
  createdAt: Datetime
  updatedAt: Datetime
}

"""The output of our update \`RepositoryRelationshipMetadatum\` mutation."""
type UpdateRepositoryRelationshipMetadatumPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """
  The \`RepositoryRelationshipMetadatum\` that was updated by this mutation.
  """
  repositoryRelationshipMetadatum: RepositoryRelationshipMetadatum

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """
  An edge for our \`RepositoryRelationshipMetadatum\`. May be used by Relay 1.
  """
  repositoryRelationshipMetadatumEdge(
    """The method to use when ordering \`RepositoryRelationshipMetadatum\`."""
    orderBy: [RepositoryRelationshipMetadatumOrderBy!]! = [PRIMARY_KEY_ASC]
  ): RepositoryRelationshipMetadatumEdge
}

"""
All input for the \`updateRepositoryRelationshipMetadatumById\` mutation.
"""
input UpdateRepositoryRelationshipMetadatumByIdInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """
  The globally unique \`ID\` which will identify a single \`RepositoryRelationshipMetadatum\` to be updated.
  """
  id: ID!

  """
  An object where the defined keys will be set on the \`RepositoryRelationshipMetadatum\` being updated.
  """
  patch: RepositoryRelationshipMetadatumPatch!
}

"""
Represents an update to a \`RepositoryRelationshipMetadatum\`. Fields that are set will be updated.
"""
input RepositoryRelationshipMetadatumPatch {
  rowId: UUID
  relationshipId: UUID
  key: String
  value: String
  createdAt: Datetime
}

"""All input for the \`updateRepositoryRelationshipMetadatum\` mutation."""
input UpdateRepositoryRelationshipMetadatumInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String
  rowId: UUID!

  """
  An object where the defined keys will be set on the \`RepositoryRelationshipMetadatum\` being updated.
  """
  patch: RepositoryRelationshipMetadatumPatch!
}

"""The output of our update \`ExternalDependency\` mutation."""
type UpdateExternalDependencyPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`ExternalDependency\` that was updated by this mutation."""
  externalDependency: ExternalDependency

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`ExternalDependency\`. May be used by Relay 1."""
  externalDependencyEdge(
    """The method to use when ordering \`ExternalDependency\`."""
    orderBy: [ExternalDependencyOrderBy!]! = [PRIMARY_KEY_ASC]
  ): ExternalDependencyEdge
}

"""All input for the \`updateExternalDependencyById\` mutation."""
input UpdateExternalDependencyByIdInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """
  The globally unique \`ID\` which will identify a single \`ExternalDependency\` to be updated.
  """
  id: ID!

  """
  An object where the defined keys will be set on the \`ExternalDependency\` being updated.
  """
  patch: ExternalDependencyPatch!
}

"""
Represents an update to a \`ExternalDependency\`. Fields that are set will be updated.
"""
input ExternalDependencyPatch {
  rowId: UUID
  repositoryId: UUID
  packageManager: String
  packageName: String
  versionConstraint: String
  detectionSource: String
  createdAt: Datetime
}

"""All input for the \`updateExternalDependency\` mutation."""
input UpdateExternalDependencyInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String
  rowId: UUID!

  """
  An object where the defined keys will be set on the \`ExternalDependency\` being updated.
  """
  patch: ExternalDependencyPatch!
}

"""The output of our update \`RepositoryCollaborator\` mutation."""
type UpdateRepositoryCollaboratorPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`RepositoryCollaborator\` that was updated by this mutation."""
  repositoryCollaborator: RepositoryCollaborator

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`RepositoryCollaborator\`. May be used by Relay 1."""
  repositoryCollaboratorEdge(
    """The method to use when ordering \`RepositoryCollaborator\`."""
    orderBy: [RepositoryCollaboratorOrderBy!]! = [PRIMARY_KEY_ASC]
  ): RepositoryCollaboratorEdge
}

"""All input for the \`updateRepositoryCollaboratorById\` mutation."""
input UpdateRepositoryCollaboratorByIdInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """
  The globally unique \`ID\` which will identify a single \`RepositoryCollaborator\` to be updated.
  """
  id: ID!

  """
  An object where the defined keys will be set on the \`RepositoryCollaborator\` being updated.
  """
  patch: RepositoryCollaboratorPatch!
}

"""
Represents an update to a \`RepositoryCollaborator\`. Fields that are set will be updated.
"""
input RepositoryCollaboratorPatch {
  repositoryId: UUID
  userId: UUID
  permission: Permission
  createdAt: Datetime
  updatedAt: Datetime
}

"""All input for the \`updateRepositoryCollaborator\` mutation."""
input UpdateRepositoryCollaboratorInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String
  repositoryId: UUID!
  userId: UUID!

  """
  An object where the defined keys will be set on the \`RepositoryCollaborator\` being updated.
  """
  patch: RepositoryCollaboratorPatch!
}

"""The output of our update \`RepositoryRelationshipType\` mutation."""
type UpdateRepositoryRelationshipTypePayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`RepositoryRelationshipType\` that was updated by this mutation."""
  repositoryRelationshipType: RepositoryRelationshipType

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`RepositoryRelationshipType\`. May be used by Relay 1."""
  repositoryRelationshipTypeEdge(
    """The method to use when ordering \`RepositoryRelationshipType\`."""
    orderBy: [RepositoryRelationshipTypeOrderBy!]! = [PRIMARY_KEY_ASC]
  ): RepositoryRelationshipTypeEdge
}

"""All input for the \`updateRepositoryRelationshipTypeById\` mutation."""
input UpdateRepositoryRelationshipTypeByIdInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """
  The globally unique \`ID\` which will identify a single \`RepositoryRelationshipType\` to be updated.
  """
  id: ID!

  """
  An object where the defined keys will be set on the \`RepositoryRelationshipType\` being updated.
  """
  patch: RepositoryRelationshipTypePatch!
}

"""
Represents an update to a \`RepositoryRelationshipType\`. Fields that are set will be updated.
"""
input RepositoryRelationshipTypePatch {
  rowId: UUID
  name: String
  description: String
  isDirected: Boolean
  organizationId: UUID
  createdAt: Datetime
}

"""All input for the \`updateRepositoryRelationshipType\` mutation."""
input UpdateRepositoryRelationshipTypeInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String
  rowId: UUID!

  """
  An object where the defined keys will be set on the \`RepositoryRelationshipType\` being updated.
  """
  patch: RepositoryRelationshipTypePatch!
}

"""The output of our update \`PullRequestReview\` mutation."""
type UpdatePullRequestReviewPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`PullRequestReview\` that was updated by this mutation."""
  pullRequestReview: PullRequestReview

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`PullRequestReview\`. May be used by Relay 1."""
  pullRequestReviewEdge(
    """The method to use when ordering \`PullRequestReview\`."""
    orderBy: [PullRequestReviewOrderBy!]! = [PRIMARY_KEY_ASC]
  ): PullRequestReviewEdge
}

"""All input for the \`updatePullRequestReviewById\` mutation."""
input UpdatePullRequestReviewByIdInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """
  The globally unique \`ID\` which will identify a single \`PullRequestReview\` to be updated.
  """
  id: ID!

  """
  An object where the defined keys will be set on the \`PullRequestReview\` being updated.
  """
  patch: PullRequestReviewPatch!
}

"""
Represents an update to a \`PullRequestReview\`. Fields that are set will be updated.
"""
input PullRequestReviewPatch {
  rowId: UUID
  pullRequestId: UUID
  reviewerId: UUID
  state: String
  body: String
  submittedAt: Datetime
  createdAt: Datetime
  updatedAt: Datetime
}

"""All input for the \`updatePullRequestReview\` mutation."""
input UpdatePullRequestReviewInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String
  rowId: UUID!

  """
  An object where the defined keys will be set on the \`PullRequestReview\` being updated.
  """
  patch: PullRequestReviewPatch!
}

"""The output of our update \`User\` mutation."""
type UpdateUserPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`User\` that was updated by this mutation."""
  user: User

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`User\`. May be used by Relay 1."""
  userEdge(
    """The method to use when ordering \`User\`."""
    orderBy: [UserOrderBy!]! = [PRIMARY_KEY_ASC]
  ): UserEdge
}

"""All input for the \`updateUserById\` mutation."""
input UpdateUserByIdInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """
  The globally unique \`ID\` which will identify a single \`User\` to be updated.
  """
  id: ID!

  """
  An object where the defined keys will be set on the \`User\` being updated.
  """
  patch: UserPatch!
}

"""Represents an update to a \`User\`. Fields that are set will be updated."""
input UserPatch {
  rowId: UUID
  identityProviderId: UUID
  name: String
  avatarUrl: String
  email: String
  createdAt: Datetime
  updatedAt: Datetime
  username: String
  bio: String
}

"""All input for the \`updateUser\` mutation."""
input UpdateUserInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String
  rowId: UUID!

  """
  An object where the defined keys will be set on the \`User\` being updated.
  """
  patch: UserPatch!
}

"""The output of our update \`PullRequestComment\` mutation."""
type UpdatePullRequestCommentPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`PullRequestComment\` that was updated by this mutation."""
  pullRequestComment: PullRequestComment

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`PullRequestComment\`. May be used by Relay 1."""
  pullRequestCommentEdge(
    """The method to use when ordering \`PullRequestComment\`."""
    orderBy: [PullRequestCommentOrderBy!]! = [PRIMARY_KEY_ASC]
  ): PullRequestCommentEdge
}

"""All input for the \`updatePullRequestCommentById\` mutation."""
input UpdatePullRequestCommentByIdInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """
  The globally unique \`ID\` which will identify a single \`PullRequestComment\` to be updated.
  """
  id: ID!

  """
  An object where the defined keys will be set on the \`PullRequestComment\` being updated.
  """
  patch: PullRequestCommentPatch!
}

"""
Represents an update to a \`PullRequestComment\`. Fields that are set will be updated.
"""
input PullRequestCommentPatch {
  rowId: UUID
  pullRequestId: UUID
  authorId: UUID
  body: String
  path: String
  line: Int
  side: String
  commitSha: String
  replyToId: UUID
  createdAt: Datetime
  updatedAt: Datetime
}

"""All input for the \`updatePullRequestComment\` mutation."""
input UpdatePullRequestCommentInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String
  rowId: UUID!

  """
  An object where the defined keys will be set on the \`PullRequestComment\` being updated.
  """
  patch: PullRequestCommentPatch!
}

"""The output of our update \`RepositoryRelationship\` mutation."""
type UpdateRepositoryRelationshipPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`RepositoryRelationship\` that was updated by this mutation."""
  repositoryRelationship: RepositoryRelationship

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`RepositoryRelationship\`. May be used by Relay 1."""
  repositoryRelationshipEdge(
    """The method to use when ordering \`RepositoryRelationship\`."""
    orderBy: [RepositoryRelationshipOrderBy!]! = [PRIMARY_KEY_ASC]
  ): RepositoryRelationshipEdge
}

"""All input for the \`updateRepositoryRelationshipById\` mutation."""
input UpdateRepositoryRelationshipByIdInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """
  The globally unique \`ID\` which will identify a single \`RepositoryRelationship\` to be updated.
  """
  id: ID!

  """
  An object where the defined keys will be set on the \`RepositoryRelationship\` being updated.
  """
  patch: RepositoryRelationshipPatch!
}

"""
Represents an update to a \`RepositoryRelationship\`. Fields that are set will be updated.
"""
input RepositoryRelationshipPatch {
  rowId: UUID
  sourceRepositoryId: UUID
  targetRepositoryId: UUID
  relationshipTypeId: UUID
  detectionSource: String
  confidence: Float
  versionConstraint: String
  branch: String
  createdAt: Datetime
  updatedAt: Datetime
}

"""All input for the \`updateRepositoryRelationship\` mutation."""
input UpdateRepositoryRelationshipInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String
  rowId: UUID!

  """
  An object where the defined keys will be set on the \`RepositoryRelationship\` being updated.
  """
  patch: RepositoryRelationshipPatch!
}

"""The output of our update \`Organization\` mutation."""
type UpdateOrganizationPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`Organization\` that was updated by this mutation."""
  organization: Organization

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`Organization\`. May be used by Relay 1."""
  organizationEdge(
    """The method to use when ordering \`Organization\`."""
    orderBy: [OrganizationOrderBy!]! = [PRIMARY_KEY_ASC]
  ): OrganizationEdge
}

"""All input for the \`updateOrganizationById\` mutation."""
input UpdateOrganizationByIdInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """
  The globally unique \`ID\` which will identify a single \`Organization\` to be updated.
  """
  id: ID!

  """
  An object where the defined keys will be set on the \`Organization\` being updated.
  """
  patch: OrganizationPatch!
}

"""
Represents an update to a \`Organization\`. Fields that are set will be updated.
"""
input OrganizationPatch {
  rowId: UUID
  description: String
  avatarUrl: String
  createdAt: Datetime
  updatedAt: Datetime
  idpOrganizationId: String
  subscriptionId: String
  billingAccountId: String
  deletedAt: Datetime
  deletionReason: String
}

"""All input for the \`updateOrganization\` mutation."""
input UpdateOrganizationInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String
  rowId: UUID!

  """
  An object where the defined keys will be set on the \`Organization\` being updated.
  """
  patch: OrganizationPatch!
}

"""The output of our update \`Repository\` mutation."""
type UpdateRepositoryPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`Repository\` that was updated by this mutation."""
  repository: Repository

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`Repository\`. May be used by Relay 1."""
  repositoryEdge(
    """The method to use when ordering \`Repository\`."""
    orderBy: [RepositoryOrderBy!]! = [PRIMARY_KEY_ASC]
  ): RepositoryEdge
}

"""All input for the \`updateRepositoryById\` mutation."""
input UpdateRepositoryByIdInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """
  The globally unique \`ID\` which will identify a single \`Repository\` to be updated.
  """
  id: ID!

  """
  An object where the defined keys will be set on the \`Repository\` being updated.
  """
  patch: RepositoryPatch!
}

"""
Represents an update to a \`Repository\`. Fields that are set will be updated.
"""
input RepositoryPatch {
  rowId: UUID
  ownerId: UUID
  organizationId: UUID
  name: String
  slug: String
  description: String
  visibility: Visibility
  defaultBranch: String
  createdAt: Datetime
  updatedAt: Datetime
}

"""All input for the \`updateRepository\` mutation."""
input UpdateRepositoryInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String
  rowId: UUID!

  """
  An object where the defined keys will be set on the \`Repository\` being updated.
  """
  patch: RepositoryPatch!
}

"""The output of our update \`PullRequest\` mutation."""
type UpdatePullRequestPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`PullRequest\` that was updated by this mutation."""
  pullRequest: PullRequest

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`PullRequest\`. May be used by Relay 1."""
  pullRequestEdge(
    """The method to use when ordering \`PullRequest\`."""
    orderBy: [PullRequestOrderBy!]! = [PRIMARY_KEY_ASC]
  ): PullRequestEdge
}

"""All input for the \`updatePullRequestById\` mutation."""
input UpdatePullRequestByIdInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """
  The globally unique \`ID\` which will identify a single \`PullRequest\` to be updated.
  """
  id: ID!

  """
  An object where the defined keys will be set on the \`PullRequest\` being updated.
  """
  patch: PullRequestPatch!
}

"""
Represents an update to a \`PullRequest\`. Fields that are set will be updated.
"""
input PullRequestPatch {
  rowId: UUID
  number: Int
  repositoryId: UUID
  authorId: UUID
  title: String
  description: String
  state: String
  sourceBranch: String
  targetBranch: String
  mergeCommitSha: String
  mergedAt: Datetime
  mergedById: UUID
  closedAt: Datetime
  createdAt: Datetime
  updatedAt: Datetime
}

"""All input for the \`updatePullRequest\` mutation."""
input UpdatePullRequestInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String
  rowId: UUID!

  """
  An object where the defined keys will be set on the \`PullRequest\` being updated.
  """
  patch: PullRequestPatch!
}

"""The output of our delete \`RepositoryRelationshipMetadatum\` mutation."""
type DeleteRepositoryRelationshipMetadatumPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """
  The \`RepositoryRelationshipMetadatum\` that was deleted by this mutation.
  """
  repositoryRelationshipMetadatum: RepositoryRelationshipMetadatum
  deletedRepositoryRelationshipMetadatumId: ID

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """
  An edge for our \`RepositoryRelationshipMetadatum\`. May be used by Relay 1.
  """
  repositoryRelationshipMetadatumEdge(
    """The method to use when ordering \`RepositoryRelationshipMetadatum\`."""
    orderBy: [RepositoryRelationshipMetadatumOrderBy!]! = [PRIMARY_KEY_ASC]
  ): RepositoryRelationshipMetadatumEdge
}

"""
All input for the \`deleteRepositoryRelationshipMetadatumById\` mutation.
"""
input DeleteRepositoryRelationshipMetadatumByIdInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """
  The globally unique \`ID\` which will identify a single \`RepositoryRelationshipMetadatum\` to be deleted.
  """
  id: ID!
}

"""All input for the \`deleteRepositoryRelationshipMetadatum\` mutation."""
input DeleteRepositoryRelationshipMetadatumInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String
  rowId: UUID!
}

"""The output of our delete \`ExternalDependency\` mutation."""
type DeleteExternalDependencyPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`ExternalDependency\` that was deleted by this mutation."""
  externalDependency: ExternalDependency
  deletedExternalDependencyId: ID

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`ExternalDependency\`. May be used by Relay 1."""
  externalDependencyEdge(
    """The method to use when ordering \`ExternalDependency\`."""
    orderBy: [ExternalDependencyOrderBy!]! = [PRIMARY_KEY_ASC]
  ): ExternalDependencyEdge
}

"""All input for the \`deleteExternalDependencyById\` mutation."""
input DeleteExternalDependencyByIdInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """
  The globally unique \`ID\` which will identify a single \`ExternalDependency\` to be deleted.
  """
  id: ID!
}

"""All input for the \`deleteExternalDependency\` mutation."""
input DeleteExternalDependencyInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String
  rowId: UUID!
}

"""The output of our delete \`RepositoryCollaborator\` mutation."""
type DeleteRepositoryCollaboratorPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`RepositoryCollaborator\` that was deleted by this mutation."""
  repositoryCollaborator: RepositoryCollaborator
  deletedRepositoryCollaboratorId: ID

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`RepositoryCollaborator\`. May be used by Relay 1."""
  repositoryCollaboratorEdge(
    """The method to use when ordering \`RepositoryCollaborator\`."""
    orderBy: [RepositoryCollaboratorOrderBy!]! = [PRIMARY_KEY_ASC]
  ): RepositoryCollaboratorEdge
}

"""All input for the \`deleteRepositoryCollaboratorById\` mutation."""
input DeleteRepositoryCollaboratorByIdInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """
  The globally unique \`ID\` which will identify a single \`RepositoryCollaborator\` to be deleted.
  """
  id: ID!
}

"""All input for the \`deleteRepositoryCollaborator\` mutation."""
input DeleteRepositoryCollaboratorInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String
  repositoryId: UUID!
  userId: UUID!
}

"""The output of our delete \`RepositoryRelationshipType\` mutation."""
type DeleteRepositoryRelationshipTypePayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`RepositoryRelationshipType\` that was deleted by this mutation."""
  repositoryRelationshipType: RepositoryRelationshipType
  deletedRepositoryRelationshipTypeId: ID

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`RepositoryRelationshipType\`. May be used by Relay 1."""
  repositoryRelationshipTypeEdge(
    """The method to use when ordering \`RepositoryRelationshipType\`."""
    orderBy: [RepositoryRelationshipTypeOrderBy!]! = [PRIMARY_KEY_ASC]
  ): RepositoryRelationshipTypeEdge
}

"""All input for the \`deleteRepositoryRelationshipTypeById\` mutation."""
input DeleteRepositoryRelationshipTypeByIdInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """
  The globally unique \`ID\` which will identify a single \`RepositoryRelationshipType\` to be deleted.
  """
  id: ID!
}

"""All input for the \`deleteRepositoryRelationshipType\` mutation."""
input DeleteRepositoryRelationshipTypeInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String
  rowId: UUID!
}

"""The output of our delete \`PullRequestReview\` mutation."""
type DeletePullRequestReviewPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`PullRequestReview\` that was deleted by this mutation."""
  pullRequestReview: PullRequestReview
  deletedPullRequestReviewId: ID

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`PullRequestReview\`. May be used by Relay 1."""
  pullRequestReviewEdge(
    """The method to use when ordering \`PullRequestReview\`."""
    orderBy: [PullRequestReviewOrderBy!]! = [PRIMARY_KEY_ASC]
  ): PullRequestReviewEdge
}

"""All input for the \`deletePullRequestReviewById\` mutation."""
input DeletePullRequestReviewByIdInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """
  The globally unique \`ID\` which will identify a single \`PullRequestReview\` to be deleted.
  """
  id: ID!
}

"""All input for the \`deletePullRequestReview\` mutation."""
input DeletePullRequestReviewInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String
  rowId: UUID!
}

"""The output of our delete \`User\` mutation."""
type DeleteUserPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`User\` that was deleted by this mutation."""
  user: User
  deletedUserId: ID

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`User\`. May be used by Relay 1."""
  userEdge(
    """The method to use when ordering \`User\`."""
    orderBy: [UserOrderBy!]! = [PRIMARY_KEY_ASC]
  ): UserEdge
}

"""All input for the \`deleteUserById\` mutation."""
input DeleteUserByIdInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """
  The globally unique \`ID\` which will identify a single \`User\` to be deleted.
  """
  id: ID!
}

"""All input for the \`deleteUser\` mutation."""
input DeleteUserInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String
  rowId: UUID!
}

"""The output of our delete \`PullRequestComment\` mutation."""
type DeletePullRequestCommentPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`PullRequestComment\` that was deleted by this mutation."""
  pullRequestComment: PullRequestComment
  deletedPullRequestCommentId: ID

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`PullRequestComment\`. May be used by Relay 1."""
  pullRequestCommentEdge(
    """The method to use when ordering \`PullRequestComment\`."""
    orderBy: [PullRequestCommentOrderBy!]! = [PRIMARY_KEY_ASC]
  ): PullRequestCommentEdge
}

"""All input for the \`deletePullRequestCommentById\` mutation."""
input DeletePullRequestCommentByIdInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """
  The globally unique \`ID\` which will identify a single \`PullRequestComment\` to be deleted.
  """
  id: ID!
}

"""All input for the \`deletePullRequestComment\` mutation."""
input DeletePullRequestCommentInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String
  rowId: UUID!
}

"""The output of our delete \`RepositoryRelationship\` mutation."""
type DeleteRepositoryRelationshipPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`RepositoryRelationship\` that was deleted by this mutation."""
  repositoryRelationship: RepositoryRelationship
  deletedRepositoryRelationshipId: ID

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`RepositoryRelationship\`. May be used by Relay 1."""
  repositoryRelationshipEdge(
    """The method to use when ordering \`RepositoryRelationship\`."""
    orderBy: [RepositoryRelationshipOrderBy!]! = [PRIMARY_KEY_ASC]
  ): RepositoryRelationshipEdge
}

"""All input for the \`deleteRepositoryRelationshipById\` mutation."""
input DeleteRepositoryRelationshipByIdInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """
  The globally unique \`ID\` which will identify a single \`RepositoryRelationship\` to be deleted.
  """
  id: ID!
}

"""All input for the \`deleteRepositoryRelationship\` mutation."""
input DeleteRepositoryRelationshipInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String
  rowId: UUID!
}

"""The output of our delete \`Organization\` mutation."""
type DeleteOrganizationPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`Organization\` that was deleted by this mutation."""
  organization: Organization
  deletedOrganizationId: ID

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`Organization\`. May be used by Relay 1."""
  organizationEdge(
    """The method to use when ordering \`Organization\`."""
    orderBy: [OrganizationOrderBy!]! = [PRIMARY_KEY_ASC]
  ): OrganizationEdge
}

"""All input for the \`deleteOrganizationById\` mutation."""
input DeleteOrganizationByIdInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """
  The globally unique \`ID\` which will identify a single \`Organization\` to be deleted.
  """
  id: ID!
}

"""All input for the \`deleteOrganization\` mutation."""
input DeleteOrganizationInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String
  rowId: UUID!
}

"""The output of our delete \`Repository\` mutation."""
type DeleteRepositoryPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`Repository\` that was deleted by this mutation."""
  repository: Repository
  deletedRepositoryId: ID

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`Repository\`. May be used by Relay 1."""
  repositoryEdge(
    """The method to use when ordering \`Repository\`."""
    orderBy: [RepositoryOrderBy!]! = [PRIMARY_KEY_ASC]
  ): RepositoryEdge
}

"""All input for the \`deleteRepositoryById\` mutation."""
input DeleteRepositoryByIdInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """
  The globally unique \`ID\` which will identify a single \`Repository\` to be deleted.
  """
  id: ID!
}

"""All input for the \`deleteRepository\` mutation."""
input DeleteRepositoryInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String
  rowId: UUID!
}

"""The output of our delete \`PullRequest\` mutation."""
type DeletePullRequestPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`PullRequest\` that was deleted by this mutation."""
  pullRequest: PullRequest
  deletedPullRequestId: ID

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`PullRequest\`. May be used by Relay 1."""
  pullRequestEdge(
    """The method to use when ordering \`PullRequest\`."""
    orderBy: [PullRequestOrderBy!]! = [PRIMARY_KEY_ASC]
  ): PullRequestEdge
}

"""All input for the \`deletePullRequestById\` mutation."""
input DeletePullRequestByIdInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """
  The globally unique \`ID\` which will identify a single \`PullRequest\` to be deleted.
  """
  id: ID!
}

"""All input for the \`deletePullRequest\` mutation."""
input DeletePullRequestInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String
  rowId: UUID!
}

"""The currently authenticated user."""
type Observer {
  rowId: UUID!
  identityProviderId: UUID!
  name: String!
  email: String!
}

"""An actor in a Git commit (author or committer)."""
type GitActor {
  name: String
  email: String
  date: Datetime
}

"""Base interface for Git objects."""
interface GitObject {
  """The Git object ID (SHA)."""
  oid: String!

  """The repository this object belongs to."""
  repository: Repository!
}

"""A Git reference (branch or tag)."""
type Ref {
  """Unique identifier for this ref."""
  id: ID!

  """
  The reference name without the prefix (e.g., "master" for refs/heads/master).
  """
  name: String!

  """The reference prefix (e.g., "refs/heads/" or "refs/tags/")."""
  prefix: String!

  """The Git object the ref points to."""
  target: GitObject
}

"""A Git commit."""
type Commit implements GitObject {
  oid: String!
  repository: Repository!

  """The full commit message."""
  message: String!

  """The first line of the commit message."""
  messageHeadline: String!

  """The author of the commit."""
  author: GitActor

  """The committer of the commit."""
  committer: GitActor

  """When the commit was authored."""
  authoredDate: Datetime

  """When the commit was committed."""
  committedDate: Datetime

  """The tree object for this commit."""
  tree: Tree

  """The parent commits."""
  parents: [Commit!]!

  """Commit history starting from this commit."""
  history(
    """Number of commits to return."""
    first: Int = 20

    """Number of commits to skip."""
    offset: Int = 0

    """Filter to commits affecting this path."""
    path: String
  ): [Commit!]!
}

"""A Git tree (directory)."""
type Tree implements GitObject {
  oid: String!
  repository: Repository!

  """The entries in this tree."""
  entries: [TreeEntry!]!
}

"""An entry in a Git tree."""
type TreeEntry {
  """The entry name."""
  name: String!

  """The full path from the repository root."""
  path: String!

  """The entry type (blob, tree, or commit for submodules)."""
  type: String!

  """The file mode."""
  mode: String!

  """The Git object ID."""
  oid: String!

  """The Git object this entry points to."""
  object: GitObject
}

"""A Git blob (file content)."""
type Blob implements GitObject {
  oid: String!
  repository: Repository!

  """UTF-8 text content, or null if binary."""
  text: String

  """Size of the blob in bytes."""
  byteSize: Int!

  """Whether this blob is binary."""
  isBinary: Boolean!
}

"""A connection to a list of refs."""
type RefConnection {
  """The refs."""
  nodes: [Ref!]!

  """The total count of refs."""
  totalCount: Int!
}

"""Input for initializing a repository's git storage."""
input InitializeRepositoryInput {
  """The repository ID."""
  repositoryId: UUID!
}

"""Payload for initializeRepository mutation."""
type InitializeRepositoryPayload {
  """Whether the initialization was successful."""
  success: Boolean!

  """The repository that was initialized."""
  repository: Repository

  """Error message if initialization failed."""
  error: String
}

"""Input for creating a new ref."""
input CreateRefInput {
  """The repository ID."""
  repositoryId: UUID!

  """The fully qualified ref name (e.g., "refs/heads/feature-branch")."""
  name: String!

  """The SHA or ref to point to."""
  oid: String!
}

"""Payload for createRef mutation."""
type CreateRefPayload {
  """The created ref."""
  ref: Ref

  """Error message if creation failed."""
  error: String
}

"""Input for deleting a ref."""
input DeleteRefInput {
  """The repository ID."""
  repositoryId: UUID!

  """The fully qualified ref name (e.g., "refs/heads/feature-branch")."""
  name: String!
}

"""Payload for deleteRef mutation."""
type DeleteRefPayload {
  """Whether the deletion was successful."""
  success: Boolean!

  """Error message if deletion failed."""
  error: String
}

"""Input for merging a pull request."""
input MergePullRequestInput {
  """The pull request ID."""
  pullRequestId: UUID!

  """
  Optional custom commit message. If not provided, a default message is used.
  """
  commitMessage: String
}

"""Payload for mergePullRequest mutation."""
type MergePullRequestPayload {
  """Whether the merge was successful."""
  success: Boolean!

  """The merge commit SHA."""
  mergeCommitSha: String

  """Error message if merge failed."""
  error: String
}

"""The root query type which gives access points into the data universe."""
type Query implements Node {
  """
  Exposes the root query type nested one level down. This is helpful for Relay 1
  which can only query top level fields if they are in a particular form.
  """
  query: Query!

  """
  The root query type must be a \`Node\` to work well with Relay 1 mutations. This just resolves to \`query\`.
  """
  id: ID!

  """Fetches an object given its globally unique \`ID\`."""
  node(
    """The globally unique \`ID\`."""
    id: ID!
  ): Node

  """Get a single \`RepositoryRelationshipMetadatum\`."""
  repositoryRelationshipMetadatum(rowId: UUID!): RepositoryRelationshipMetadatum

  """Get a single \`ExternalDependency\`."""
  externalDependency(rowId: UUID!): ExternalDependency

  """Get a single \`RepositoryCollaborator\`."""
  repositoryCollaborator(repositoryId: UUID!, userId: UUID!): RepositoryCollaborator

  """Get a single \`RepositoryRelationshipType\`."""
  repositoryRelationshipType(rowId: UUID!): RepositoryRelationshipType

  """Get a single \`PullRequestReview\`."""
  pullRequestReview(rowId: UUID!): PullRequestReview

  """Get a single \`User\`."""
  user(rowId: UUID!): User

  """Get a single \`User\`."""
  userByEmail(email: String!): User

  """Get a single \`User\`."""
  userByIdentityProviderId(identityProviderId: UUID!): User

  """Get a single \`User\`."""
  userByUsername(username: String!): User

  """Get a single \`PullRequestComment\`."""
  pullRequestComment(rowId: UUID!): PullRequestComment

  """Get a single \`RepositoryRelationship\`."""
  repositoryRelationship(rowId: UUID!): RepositoryRelationship

  """Get a single \`Organization\`."""
  organization(rowId: UUID!): Organization

  """Get a single \`Organization\`."""
  organizationByIdpOrganizationId(idpOrganizationId: String!): Organization

  """Get a single \`Repository\`."""
  repository(rowId: UUID!): Repository

  """Get a single \`PullRequest\`."""
  pullRequest(rowId: UUID!): PullRequest

  """
  Reads a single \`RepositoryRelationshipMetadatum\` using its globally unique \`ID\`.
  """
  repositoryRelationshipMetadatumById(
    """
    The globally unique \`ID\` to be used in selecting a single \`RepositoryRelationshipMetadatum\`.
    """
    id: ID!
  ): RepositoryRelationshipMetadatum

  """Reads a single \`ExternalDependency\` using its globally unique \`ID\`."""
  externalDependencyById(
    """
    The globally unique \`ID\` to be used in selecting a single \`ExternalDependency\`.
    """
    id: ID!
  ): ExternalDependency

  """
  Reads a single \`RepositoryCollaborator\` using its globally unique \`ID\`.
  """
  repositoryCollaboratorById(
    """
    The globally unique \`ID\` to be used in selecting a single \`RepositoryCollaborator\`.
    """
    id: ID!
  ): RepositoryCollaborator

  """
  Reads a single \`RepositoryRelationshipType\` using its globally unique \`ID\`.
  """
  repositoryRelationshipTypeById(
    """
    The globally unique \`ID\` to be used in selecting a single \`RepositoryRelationshipType\`.
    """
    id: ID!
  ): RepositoryRelationshipType

  """Reads a single \`PullRequestReview\` using its globally unique \`ID\`."""
  pullRequestReviewById(
    """
    The globally unique \`ID\` to be used in selecting a single \`PullRequestReview\`.
    """
    id: ID!
  ): PullRequestReview

  """Reads a single \`User\` using its globally unique \`ID\`."""
  userById(
    """The globally unique \`ID\` to be used in selecting a single \`User\`."""
    id: ID!
  ): User

  """Reads a single \`PullRequestComment\` using its globally unique \`ID\`."""
  pullRequestCommentById(
    """
    The globally unique \`ID\` to be used in selecting a single \`PullRequestComment\`.
    """
    id: ID!
  ): PullRequestComment

  """
  Reads a single \`RepositoryRelationship\` using its globally unique \`ID\`.
  """
  repositoryRelationshipById(
    """
    The globally unique \`ID\` to be used in selecting a single \`RepositoryRelationship\`.
    """
    id: ID!
  ): RepositoryRelationship

  """Reads a single \`Organization\` using its globally unique \`ID\`."""
  organizationById(
    """
    The globally unique \`ID\` to be used in selecting a single \`Organization\`.
    """
    id: ID!
  ): Organization

  """Reads a single \`Repository\` using its globally unique \`ID\`."""
  repositoryById(
    """
    The globally unique \`ID\` to be used in selecting a single \`Repository\`.
    """
    id: ID!
  ): Repository

  """Reads a single \`PullRequest\` using its globally unique \`ID\`."""
  pullRequestById(
    """
    The globally unique \`ID\` to be used in selecting a single \`PullRequest\`.
    """
    id: ID!
  ): PullRequest

  """
  Reads and enables pagination through a set of \`RepositoryRelationshipMetadatum\`.
  """
  repositoryRelationshipMetadata(
    """Only read the first \`n\` values of the set."""
    first: Int

    """Only read the last \`n\` values of the set."""
    last: Int

    """
    Skip the first \`n\` values from our \`after\` cursor, an alternative to cursor
    based pagination. May not be used with \`last\`.
    """
    offset: Int

    """Read all values in the set before (above) this cursor."""
    before: Cursor

    """Read all values in the set after (below) this cursor."""
    after: Cursor

    """
    A condition to be used in determining which values should be returned by the collection.
    """
    condition: RepositoryRelationshipMetadatumCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: RepositoryRelationshipMetadatumFilter

    """The method to use when ordering \`RepositoryRelationshipMetadatum\`."""
    orderBy: [RepositoryRelationshipMetadatumOrderBy!] = [PRIMARY_KEY_ASC]
  ): RepositoryRelationshipMetadatumConnection

  """Reads and enables pagination through a set of \`ExternalDependency\`."""
  externalDependencies(
    """Only read the first \`n\` values of the set."""
    first: Int

    """Only read the last \`n\` values of the set."""
    last: Int

    """
    Skip the first \`n\` values from our \`after\` cursor, an alternative to cursor
    based pagination. May not be used with \`last\`.
    """
    offset: Int

    """Read all values in the set before (above) this cursor."""
    before: Cursor

    """Read all values in the set after (below) this cursor."""
    after: Cursor

    """
    A condition to be used in determining which values should be returned by the collection.
    """
    condition: ExternalDependencyCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: ExternalDependencyFilter

    """The method to use when ordering \`ExternalDependency\`."""
    orderBy: [ExternalDependencyOrderBy!] = [PRIMARY_KEY_ASC]
  ): ExternalDependencyConnection

  """
  Reads and enables pagination through a set of \`RepositoryCollaborator\`.
  """
  repositoryCollaborators(
    """Only read the first \`n\` values of the set."""
    first: Int

    """Only read the last \`n\` values of the set."""
    last: Int

    """
    Skip the first \`n\` values from our \`after\` cursor, an alternative to cursor
    based pagination. May not be used with \`last\`.
    """
    offset: Int

    """Read all values in the set before (above) this cursor."""
    before: Cursor

    """Read all values in the set after (below) this cursor."""
    after: Cursor

    """
    A condition to be used in determining which values should be returned by the collection.
    """
    condition: RepositoryCollaboratorCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: RepositoryCollaboratorFilter

    """The method to use when ordering \`RepositoryCollaborator\`."""
    orderBy: [RepositoryCollaboratorOrderBy!] = [PRIMARY_KEY_ASC]
  ): RepositoryCollaboratorConnection

  """
  Reads and enables pagination through a set of \`RepositoryRelationshipType\`.
  """
  repositoryRelationshipTypes(
    """Only read the first \`n\` values of the set."""
    first: Int

    """Only read the last \`n\` values of the set."""
    last: Int

    """
    Skip the first \`n\` values from our \`after\` cursor, an alternative to cursor
    based pagination. May not be used with \`last\`.
    """
    offset: Int

    """Read all values in the set before (above) this cursor."""
    before: Cursor

    """Read all values in the set after (below) this cursor."""
    after: Cursor

    """
    A condition to be used in determining which values should be returned by the collection.
    """
    condition: RepositoryRelationshipTypeCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: RepositoryRelationshipTypeFilter

    """The method to use when ordering \`RepositoryRelationshipType\`."""
    orderBy: [RepositoryRelationshipTypeOrderBy!] = [PRIMARY_KEY_ASC]
  ): RepositoryRelationshipTypeConnection

  """Reads and enables pagination through a set of \`PullRequestReview\`."""
  pullRequestReviews(
    """Only read the first \`n\` values of the set."""
    first: Int

    """Only read the last \`n\` values of the set."""
    last: Int

    """
    Skip the first \`n\` values from our \`after\` cursor, an alternative to cursor
    based pagination. May not be used with \`last\`.
    """
    offset: Int

    """Read all values in the set before (above) this cursor."""
    before: Cursor

    """Read all values in the set after (below) this cursor."""
    after: Cursor

    """
    A condition to be used in determining which values should be returned by the collection.
    """
    condition: PullRequestReviewCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: PullRequestReviewFilter

    """The method to use when ordering \`PullRequestReview\`."""
    orderBy: [PullRequestReviewOrderBy!] = [PRIMARY_KEY_ASC]
  ): PullRequestReviewConnection

  """Reads and enables pagination through a set of \`User\`."""
  users(
    """Only read the first \`n\` values of the set."""
    first: Int

    """Only read the last \`n\` values of the set."""
    last: Int

    """
    Skip the first \`n\` values from our \`after\` cursor, an alternative to cursor
    based pagination. May not be used with \`last\`.
    """
    offset: Int

    """Read all values in the set before (above) this cursor."""
    before: Cursor

    """Read all values in the set after (below) this cursor."""
    after: Cursor

    """
    A condition to be used in determining which values should be returned by the collection.
    """
    condition: UserCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: UserFilter

    """The method to use when ordering \`User\`."""
    orderBy: [UserOrderBy!] = [PRIMARY_KEY_ASC]
  ): UserConnection

  """Reads and enables pagination through a set of \`PullRequestComment\`."""
  pullRequestComments(
    """Only read the first \`n\` values of the set."""
    first: Int

    """Only read the last \`n\` values of the set."""
    last: Int

    """
    Skip the first \`n\` values from our \`after\` cursor, an alternative to cursor
    based pagination. May not be used with \`last\`.
    """
    offset: Int

    """Read all values in the set before (above) this cursor."""
    before: Cursor

    """Read all values in the set after (below) this cursor."""
    after: Cursor

    """
    A condition to be used in determining which values should be returned by the collection.
    """
    condition: PullRequestCommentCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: PullRequestCommentFilter

    """The method to use when ordering \`PullRequestComment\`."""
    orderBy: [PullRequestCommentOrderBy!] = [PRIMARY_KEY_ASC]
  ): PullRequestCommentConnection

  """
  Reads and enables pagination through a set of \`RepositoryRelationship\`.
  """
  repositoryRelationships(
    """Only read the first \`n\` values of the set."""
    first: Int

    """Only read the last \`n\` values of the set."""
    last: Int

    """
    Skip the first \`n\` values from our \`after\` cursor, an alternative to cursor
    based pagination. May not be used with \`last\`.
    """
    offset: Int

    """Read all values in the set before (above) this cursor."""
    before: Cursor

    """Read all values in the set after (below) this cursor."""
    after: Cursor

    """
    A condition to be used in determining which values should be returned by the collection.
    """
    condition: RepositoryRelationshipCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: RepositoryRelationshipFilter

    """The method to use when ordering \`RepositoryRelationship\`."""
    orderBy: [RepositoryRelationshipOrderBy!] = [PRIMARY_KEY_ASC]
  ): RepositoryRelationshipConnection

  """Reads and enables pagination through a set of \`Organization\`."""
  organizations(
    """Only read the first \`n\` values of the set."""
    first: Int

    """Only read the last \`n\` values of the set."""
    last: Int

    """
    Skip the first \`n\` values from our \`after\` cursor, an alternative to cursor
    based pagination. May not be used with \`last\`.
    """
    offset: Int

    """Read all values in the set before (above) this cursor."""
    before: Cursor

    """Read all values in the set after (below) this cursor."""
    after: Cursor

    """
    A condition to be used in determining which values should be returned by the collection.
    """
    condition: OrganizationCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: OrganizationFilter

    """The method to use when ordering \`Organization\`."""
    orderBy: [OrganizationOrderBy!] = [PRIMARY_KEY_ASC]
  ): OrganizationConnection

  """Reads and enables pagination through a set of \`Repository\`."""
  repositories(
    """Only read the first \`n\` values of the set."""
    first: Int

    """Only read the last \`n\` values of the set."""
    last: Int

    """
    Skip the first \`n\` values from our \`after\` cursor, an alternative to cursor
    based pagination. May not be used with \`last\`.
    """
    offset: Int

    """Read all values in the set before (above) this cursor."""
    before: Cursor

    """Read all values in the set after (below) this cursor."""
    after: Cursor

    """
    A condition to be used in determining which values should be returned by the collection.
    """
    condition: RepositoryCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: RepositoryFilter

    """The method to use when ordering \`Repository\`."""
    orderBy: [RepositoryOrderBy!] = [PRIMARY_KEY_ASC]
  ): RepositoryConnection

  """Reads and enables pagination through a set of \`PullRequest\`."""
  pullRequests(
    """Only read the first \`n\` values of the set."""
    first: Int

    """Only read the last \`n\` values of the set."""
    last: Int

    """
    Skip the first \`n\` values from our \`after\` cursor, an alternative to cursor
    based pagination. May not be used with \`last\`.
    """
    offset: Int

    """Read all values in the set before (above) this cursor."""
    before: Cursor

    """Read all values in the set after (below) this cursor."""
    after: Cursor

    """
    A condition to be used in determining which values should be returned by the collection.
    """
    condition: PullRequestCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: PullRequestFilter

    """The method to use when ordering \`PullRequest\`."""
    orderBy: [PullRequestOrderBy!] = [PRIMARY_KEY_ASC]
  ): PullRequestConnection

  """
  Returns the currently authenticated user (observer).
  Returns null if not authenticated.
  """
  observer: Observer
}

"""
The root mutation type which contains root level fields which mutate data.
"""
type Mutation {
  """Creates a single \`RepositoryRelationshipMetadatum\`."""
  createRepositoryRelationshipMetadatum(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: CreateRepositoryRelationshipMetadatumInput!
  ): CreateRepositoryRelationshipMetadatumPayload

  """Creates a single \`ExternalDependency\`."""
  createExternalDependency(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: CreateExternalDependencyInput!
  ): CreateExternalDependencyPayload

  """Creates a single \`RepositoryCollaborator\`."""
  createRepositoryCollaborator(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: CreateRepositoryCollaboratorInput!
  ): CreateRepositoryCollaboratorPayload

  """Creates a single \`RepositoryRelationshipType\`."""
  createRepositoryRelationshipType(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: CreateRepositoryRelationshipTypeInput!
  ): CreateRepositoryRelationshipTypePayload

  """Creates a single \`PullRequestReview\`."""
  createPullRequestReview(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: CreatePullRequestReviewInput!
  ): CreatePullRequestReviewPayload

  """Creates a single \`User\`."""
  createUser(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: CreateUserInput!
  ): CreateUserPayload

  """Creates a single \`PullRequestComment\`."""
  createPullRequestComment(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: CreatePullRequestCommentInput!
  ): CreatePullRequestCommentPayload

  """Creates a single \`RepositoryRelationship\`."""
  createRepositoryRelationship(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: CreateRepositoryRelationshipInput!
  ): CreateRepositoryRelationshipPayload

  """Creates a single \`Organization\`."""
  createOrganization(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: CreateOrganizationInput!
  ): CreateOrganizationPayload

  """Creates a single \`Repository\`."""
  createRepository(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: CreateRepositoryInput!
  ): CreateRepositoryPayload

  """Creates a single \`PullRequest\`."""
  createPullRequest(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: CreatePullRequestInput!
  ): CreatePullRequestPayload

  """
  Updates a single \`RepositoryRelationshipMetadatum\` using its globally unique id and a patch.
  """
  updateRepositoryRelationshipMetadatumById(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: UpdateRepositoryRelationshipMetadatumByIdInput!
  ): UpdateRepositoryRelationshipMetadatumPayload

  """
  Updates a single \`RepositoryRelationshipMetadatum\` using a unique key and a patch.
  """
  updateRepositoryRelationshipMetadatum(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: UpdateRepositoryRelationshipMetadatumInput!
  ): UpdateRepositoryRelationshipMetadatumPayload

  """
  Updates a single \`ExternalDependency\` using its globally unique id and a patch.
  """
  updateExternalDependencyById(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: UpdateExternalDependencyByIdInput!
  ): UpdateExternalDependencyPayload

  """Updates a single \`ExternalDependency\` using a unique key and a patch."""
  updateExternalDependency(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: UpdateExternalDependencyInput!
  ): UpdateExternalDependencyPayload

  """
  Updates a single \`RepositoryCollaborator\` using its globally unique id and a patch.
  """
  updateRepositoryCollaboratorById(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: UpdateRepositoryCollaboratorByIdInput!
  ): UpdateRepositoryCollaboratorPayload

  """
  Updates a single \`RepositoryCollaborator\` using a unique key and a patch.
  """
  updateRepositoryCollaborator(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: UpdateRepositoryCollaboratorInput!
  ): UpdateRepositoryCollaboratorPayload

  """
  Updates a single \`RepositoryRelationshipType\` using its globally unique id and a patch.
  """
  updateRepositoryRelationshipTypeById(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: UpdateRepositoryRelationshipTypeByIdInput!
  ): UpdateRepositoryRelationshipTypePayload

  """
  Updates a single \`RepositoryRelationshipType\` using a unique key and a patch.
  """
  updateRepositoryRelationshipType(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: UpdateRepositoryRelationshipTypeInput!
  ): UpdateRepositoryRelationshipTypePayload

  """
  Updates a single \`PullRequestReview\` using its globally unique id and a patch.
  """
  updatePullRequestReviewById(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: UpdatePullRequestReviewByIdInput!
  ): UpdatePullRequestReviewPayload

  """Updates a single \`PullRequestReview\` using a unique key and a patch."""
  updatePullRequestReview(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: UpdatePullRequestReviewInput!
  ): UpdatePullRequestReviewPayload

  """Updates a single \`User\` using its globally unique id and a patch."""
  updateUserById(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: UpdateUserByIdInput!
  ): UpdateUserPayload

  """Updates a single \`User\` using a unique key and a patch."""
  updateUser(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: UpdateUserInput!
  ): UpdateUserPayload

  """
  Updates a single \`PullRequestComment\` using its globally unique id and a patch.
  """
  updatePullRequestCommentById(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: UpdatePullRequestCommentByIdInput!
  ): UpdatePullRequestCommentPayload

  """Updates a single \`PullRequestComment\` using a unique key and a patch."""
  updatePullRequestComment(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: UpdatePullRequestCommentInput!
  ): UpdatePullRequestCommentPayload

  """
  Updates a single \`RepositoryRelationship\` using its globally unique id and a patch.
  """
  updateRepositoryRelationshipById(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: UpdateRepositoryRelationshipByIdInput!
  ): UpdateRepositoryRelationshipPayload

  """
  Updates a single \`RepositoryRelationship\` using a unique key and a patch.
  """
  updateRepositoryRelationship(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: UpdateRepositoryRelationshipInput!
  ): UpdateRepositoryRelationshipPayload

  """
  Updates a single \`Organization\` using its globally unique id and a patch.
  """
  updateOrganizationById(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: UpdateOrganizationByIdInput!
  ): UpdateOrganizationPayload

  """Updates a single \`Organization\` using a unique key and a patch."""
  updateOrganization(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: UpdateOrganizationInput!
  ): UpdateOrganizationPayload

  """
  Updates a single \`Repository\` using its globally unique id and a patch.
  """
  updateRepositoryById(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: UpdateRepositoryByIdInput!
  ): UpdateRepositoryPayload

  """Updates a single \`Repository\` using a unique key and a patch."""
  updateRepository(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: UpdateRepositoryInput!
  ): UpdateRepositoryPayload

  """
  Updates a single \`PullRequest\` using its globally unique id and a patch.
  """
  updatePullRequestById(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: UpdatePullRequestByIdInput!
  ): UpdatePullRequestPayload

  """Updates a single \`PullRequest\` using a unique key and a patch."""
  updatePullRequest(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: UpdatePullRequestInput!
  ): UpdatePullRequestPayload

  """
  Deletes a single \`RepositoryRelationshipMetadatum\` using its globally unique id.
  """
  deleteRepositoryRelationshipMetadatumById(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: DeleteRepositoryRelationshipMetadatumByIdInput!
  ): DeleteRepositoryRelationshipMetadatumPayload

  """Deletes a single \`RepositoryRelationshipMetadatum\` using a unique key."""
  deleteRepositoryRelationshipMetadatum(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: DeleteRepositoryRelationshipMetadatumInput!
  ): DeleteRepositoryRelationshipMetadatumPayload

  """Deletes a single \`ExternalDependency\` using its globally unique id."""
  deleteExternalDependencyById(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: DeleteExternalDependencyByIdInput!
  ): DeleteExternalDependencyPayload

  """Deletes a single \`ExternalDependency\` using a unique key."""
  deleteExternalDependency(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: DeleteExternalDependencyInput!
  ): DeleteExternalDependencyPayload

  """
  Deletes a single \`RepositoryCollaborator\` using its globally unique id.
  """
  deleteRepositoryCollaboratorById(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: DeleteRepositoryCollaboratorByIdInput!
  ): DeleteRepositoryCollaboratorPayload

  """Deletes a single \`RepositoryCollaborator\` using a unique key."""
  deleteRepositoryCollaborator(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: DeleteRepositoryCollaboratorInput!
  ): DeleteRepositoryCollaboratorPayload

  """
  Deletes a single \`RepositoryRelationshipType\` using its globally unique id.
  """
  deleteRepositoryRelationshipTypeById(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: DeleteRepositoryRelationshipTypeByIdInput!
  ): DeleteRepositoryRelationshipTypePayload

  """Deletes a single \`RepositoryRelationshipType\` using a unique key."""
  deleteRepositoryRelationshipType(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: DeleteRepositoryRelationshipTypeInput!
  ): DeleteRepositoryRelationshipTypePayload

  """Deletes a single \`PullRequestReview\` using its globally unique id."""
  deletePullRequestReviewById(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: DeletePullRequestReviewByIdInput!
  ): DeletePullRequestReviewPayload

  """Deletes a single \`PullRequestReview\` using a unique key."""
  deletePullRequestReview(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: DeletePullRequestReviewInput!
  ): DeletePullRequestReviewPayload

  """Deletes a single \`User\` using its globally unique id."""
  deleteUserById(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: DeleteUserByIdInput!
  ): DeleteUserPayload

  """Deletes a single \`User\` using a unique key."""
  deleteUser(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: DeleteUserInput!
  ): DeleteUserPayload

  """Deletes a single \`PullRequestComment\` using its globally unique id."""
  deletePullRequestCommentById(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: DeletePullRequestCommentByIdInput!
  ): DeletePullRequestCommentPayload

  """Deletes a single \`PullRequestComment\` using a unique key."""
  deletePullRequestComment(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: DeletePullRequestCommentInput!
  ): DeletePullRequestCommentPayload

  """
  Deletes a single \`RepositoryRelationship\` using its globally unique id.
  """
  deleteRepositoryRelationshipById(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: DeleteRepositoryRelationshipByIdInput!
  ): DeleteRepositoryRelationshipPayload

  """Deletes a single \`RepositoryRelationship\` using a unique key."""
  deleteRepositoryRelationship(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: DeleteRepositoryRelationshipInput!
  ): DeleteRepositoryRelationshipPayload

  """Deletes a single \`Organization\` using its globally unique id."""
  deleteOrganizationById(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: DeleteOrganizationByIdInput!
  ): DeleteOrganizationPayload

  """Deletes a single \`Organization\` using a unique key."""
  deleteOrganization(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: DeleteOrganizationInput!
  ): DeleteOrganizationPayload

  """Deletes a single \`Repository\` using its globally unique id."""
  deleteRepositoryById(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: DeleteRepositoryByIdInput!
  ): DeleteRepositoryPayload

  """Deletes a single \`Repository\` using a unique key."""
  deleteRepository(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: DeleteRepositoryInput!
  ): DeleteRepositoryPayload

  """Deletes a single \`PullRequest\` using its globally unique id."""
  deletePullRequestById(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: DeletePullRequestByIdInput!
  ): DeletePullRequestPayload

  """Deletes a single \`PullRequest\` using a unique key."""
  deletePullRequest(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: DeletePullRequestInput!
  ): DeletePullRequestPayload

  """
  Initialize git storage for a repository.
  Called after the repository record is created in the database.
  """
  initializeRepository(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: InitializeRepositoryInput!
  ): InitializeRepositoryPayload

  """Create a new ref (branch or tag)."""
  createRef(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: CreateRefInput!
  ): CreateRefPayload

  """Delete a ref (branch or tag)."""
  deleteRef(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: DeleteRefInput!
  ): DeleteRefPayload

  """
  Merge a pull request into its target branch.
  Requires write access to the repository.
  """
  mergePullRequest(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: MergePullRequestInput!
  ): MergePullRequestPayload

  """
  Create a repository and initialize git storage.
  This replaces the standard createRepository mutation to ensure
  the git repository is properly initialized on disk.
  """
  createRepositoryWithGit(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: CreateRepositoryWithGitInput!
  ): CreateRepositoryWithGitPayload
}

"""Input for creating a repository."""
input CreateRepositoryWithGitInput {
  """The repository name."""
  name: String!

  """The repository slug (URL-friendly name)."""
  slug: String!

  """Optional description."""
  description: String

  """Visibility (public or private). Defaults to public."""
  visibility: Visibility

  """Default branch name. Defaults to master."""
  defaultBranch: String

  """Organization ID if this is an organization repository."""
  organizationId: UUID
}

"""Payload for createRepositoryWithGit mutation."""
type CreateRepositoryWithGitPayload {
  """The created repository row ID."""
  rowId: UUID

  """The repository slug."""
  slug: String

  """The owner username (for personal repos)."""
  ownerUsername: String

  """The organization slug (for org repos)."""
  organizationSlug: String

  """Error message if creation failed."""
  error: String
}`;
export const objects = {
  Query: {
    assertStep() {
      return !0;
    },
    plans: {
      externalDependencies: {
        plan() {
          return connection(spec_resource_external_dependencyPgResource.find());
        },
        args: {
          first: applyFirstArg,
          last: applyLastArg,
          offset: applyOffsetArg,
          before: applyBeforeArg,
          after: applyAfterArg,
          condition: applyConditionArgToConnection,
          filter: RepositoryRelationship_repositoryRelationshipMetadataByRelationshipIdfilterApplyPlan,
          orderBy: applyOrderByArgToConnection
        }
      },
      externalDependency(_$root, {
        $rowId
      }) {
        return spec_resource_external_dependencyPgResource.get({
          id: $rowId
        });
      },
      externalDependencyById(_$parent, args) {
        const $nodeId = args.getRaw("id");
        return nodeFetcher_ExternalDependency($nodeId);
      },
      id($parent) {
        const specifier = nodeIdHandlerByTypeName.Query.plan($parent);
        return lambda(specifier, nodeIdCodecs[nodeIdHandlerByTypeName.Query.codec.name].encode);
      },
      node(_$root, fieldArgs) {
        return fieldArgs.getRaw("id");
      },
      observer() {
        const $observer = context().get("observer");
        return lambda($observer, observer => {
          if (!observer) return null;
          return {
            rowId: observer.id,
            identityProviderId: observer.identityProviderId,
            name: observer.name,
            email: observer.email
          };
        });
      },
      organization(_$root, {
        $rowId
      }) {
        return spec_resource_organizationPgResource.get({
          id: $rowId
        });
      },
      organizationById(_$parent, args) {
        const $nodeId = args.getRaw("id");
        return nodeFetcher_Organization($nodeId);
      },
      organizationByIdpOrganizationId(_$root, {
        $idpOrganizationId
      }) {
        return spec_resource_organizationPgResource.get({
          idp_organization_id: $idpOrganizationId
        });
      },
      organizations: {
        plan() {
          return connection(spec_resource_organizationPgResource.find());
        },
        args: {
          first: applyFirstArg,
          last: applyLastArg,
          offset: applyOffsetArg,
          before: applyBeforeArg,
          after: applyAfterArg,
          condition: applyConditionArgToConnection,
          filter: RepositoryRelationship_repositoryRelationshipMetadataByRelationshipIdfilterApplyPlan,
          orderBy: applyOrderByArgToConnection
        }
      },
      pullRequest(_$root, {
        $rowId
      }) {
        return spec_resource_pull_requestPgResource.get({
          id: $rowId
        });
      },
      pullRequestById(_$parent, args) {
        const $nodeId = args.getRaw("id");
        return nodeFetcher_PullRequest($nodeId);
      },
      pullRequestComment(_$root, {
        $rowId
      }) {
        return spec_resource_pull_request_commentPgResource.get({
          id: $rowId
        });
      },
      pullRequestCommentById(_$parent, args) {
        const $nodeId = args.getRaw("id");
        return nodeFetcher_PullRequestComment($nodeId);
      },
      pullRequestComments: {
        plan() {
          return connection(spec_resource_pull_request_commentPgResource.find());
        },
        args: {
          first: applyFirstArg,
          last: applyLastArg,
          offset: applyOffsetArg,
          before: applyBeforeArg,
          after: applyAfterArg,
          condition: applyConditionArgToConnection,
          filter: RepositoryRelationship_repositoryRelationshipMetadataByRelationshipIdfilterApplyPlan,
          orderBy: applyOrderByArgToConnection
        }
      },
      pullRequestReview(_$root, {
        $rowId
      }) {
        return spec_resource_pull_request_reviewPgResource.get({
          id: $rowId
        });
      },
      pullRequestReviewById(_$parent, args) {
        const $nodeId = args.getRaw("id");
        return nodeFetcher_PullRequestReview($nodeId);
      },
      pullRequestReviews: {
        plan() {
          return connection(spec_resource_pull_request_reviewPgResource.find());
        },
        args: {
          first: applyFirstArg,
          last: applyLastArg,
          offset: applyOffsetArg,
          before: applyBeforeArg,
          after: applyAfterArg,
          condition: applyConditionArgToConnection,
          filter: RepositoryRelationship_repositoryRelationshipMetadataByRelationshipIdfilterApplyPlan,
          orderBy: applyOrderByArgToConnection
        }
      },
      pullRequests: {
        plan() {
          return connection(spec_resource_pull_requestPgResource.find());
        },
        args: {
          first: applyFirstArg,
          last: applyLastArg,
          offset: applyOffsetArg,
          before: applyBeforeArg,
          after: applyAfterArg,
          condition: applyConditionArgToConnection,
          filter: RepositoryRelationship_repositoryRelationshipMetadataByRelationshipIdfilterApplyPlan,
          orderBy: applyOrderByArgToConnection
        }
      },
      query() {
        return rootValue();
      },
      repositories: {
        plan() {
          return connection(spec_resource_repositoryPgResource.find());
        },
        args: {
          first: applyFirstArg,
          last: applyLastArg,
          offset: applyOffsetArg,
          before: applyBeforeArg,
          after: applyAfterArg,
          condition: applyConditionArgToConnection,
          filter: RepositoryRelationship_repositoryRelationshipMetadataByRelationshipIdfilterApplyPlan,
          orderBy: applyOrderByArgToConnection
        }
      },
      repository(_$root, {
        $rowId
      }) {
        return spec_resource_repositoryPgResource.get({
          id: $rowId
        });
      },
      repositoryById(_$parent, args) {
        const $nodeId = args.getRaw("id");
        return nodeFetcher_Repository($nodeId);
      },
      repositoryCollaborator(_$root, {
        $repositoryId,
        $userId
      }) {
        return spec_resource_repository_collaboratorPgResource.get({
          repository_id: $repositoryId,
          user_id: $userId
        });
      },
      repositoryCollaboratorById(_$parent, args) {
        const $nodeId = args.getRaw("id");
        return nodeFetcher_RepositoryCollaborator($nodeId);
      },
      repositoryCollaborators: {
        plan() {
          return connection(spec_resource_repository_collaboratorPgResource.find());
        },
        args: {
          first: applyFirstArg,
          last: applyLastArg,
          offset: applyOffsetArg,
          before: applyBeforeArg,
          after: applyAfterArg,
          condition: applyConditionArgToConnection,
          filter: RepositoryRelationship_repositoryRelationshipMetadataByRelationshipIdfilterApplyPlan,
          orderBy: applyOrderByArgToConnection
        }
      },
      repositoryRelationship(_$root, {
        $rowId
      }) {
        return spec_resource_repository_relationshipPgResource.get({
          id: $rowId
        });
      },
      repositoryRelationshipById(_$parent, args) {
        const $nodeId = args.getRaw("id");
        return nodeFetcher_RepositoryRelationship($nodeId);
      },
      repositoryRelationshipMetadata: {
        plan() {
          return connection(spec_resource_repository_relationship_metadataPgResource.find());
        },
        args: {
          first: applyFirstArg,
          last: applyLastArg,
          offset: applyOffsetArg,
          before: applyBeforeArg,
          after: applyAfterArg,
          condition: applyConditionArgToConnection,
          filter: RepositoryRelationship_repositoryRelationshipMetadataByRelationshipIdfilterApplyPlan,
          orderBy: applyOrderByArgToConnection
        }
      },
      repositoryRelationshipMetadatum(_$root, {
        $rowId
      }) {
        return spec_resource_repository_relationship_metadataPgResource.get({
          id: $rowId
        });
      },
      repositoryRelationshipMetadatumById(_$parent, args) {
        const $nodeId = args.getRaw("id");
        return nodeFetcher_RepositoryRelationshipMetadatum($nodeId);
      },
      repositoryRelationships: {
        plan() {
          return connection(spec_resource_repository_relationshipPgResource.find());
        },
        args: {
          first: applyFirstArg,
          last: applyLastArg,
          offset: applyOffsetArg,
          before: applyBeforeArg,
          after: applyAfterArg,
          condition: applyConditionArgToConnection,
          filter: RepositoryRelationship_repositoryRelationshipMetadataByRelationshipIdfilterApplyPlan,
          orderBy: applyOrderByArgToConnection
        }
      },
      repositoryRelationshipType(_$root, {
        $rowId
      }) {
        return spec_resource_repository_relationship_typePgResource.get({
          id: $rowId
        });
      },
      repositoryRelationshipTypeById(_$parent, args) {
        const $nodeId = args.getRaw("id");
        return nodeFetcher_RepositoryRelationshipType($nodeId);
      },
      repositoryRelationshipTypes: {
        plan() {
          return connection(spec_resource_repository_relationship_typePgResource.find());
        },
        args: {
          first: applyFirstArg,
          last: applyLastArg,
          offset: applyOffsetArg,
          before: applyBeforeArg,
          after: applyAfterArg,
          condition: applyConditionArgToConnection,
          filter: RepositoryRelationship_repositoryRelationshipMetadataByRelationshipIdfilterApplyPlan,
          orderBy: applyOrderByArgToConnection
        }
      },
      user(_$root, {
        $rowId
      }) {
        return spec_resource_userPgResource.get({
          id: $rowId
        });
      },
      userByEmail(_$root, {
        $email
      }) {
        return spec_resource_userPgResource.get({
          email: $email
        });
      },
      userById(_$parent, args) {
        const $nodeId = args.getRaw("id");
        return nodeFetcher_User($nodeId);
      },
      userByIdentityProviderId(_$root, {
        $identityProviderId
      }) {
        return spec_resource_userPgResource.get({
          identity_provider_id: $identityProviderId
        });
      },
      userByUsername(_$root, {
        $username
      }) {
        return spec_resource_userPgResource.get({
          username: $username
        });
      },
      users: {
        plan() {
          return connection(spec_resource_userPgResource.find());
        },
        args: {
          first: applyFirstArg,
          last: applyLastArg,
          offset: applyOffsetArg,
          before: applyBeforeArg,
          after: applyAfterArg,
          condition: applyConditionArgToConnection,
          filter: RepositoryRelationship_repositoryRelationshipMetadataByRelationshipIdfilterApplyPlan,
          orderBy: applyOrderByArgToConnection
        }
      }
    }
  },
  Mutation: {
    assertStep: __ValueStep,
    plans: {
      createExternalDependency: {
        plan(_, args) {
          const $insert = pgInsertSingle(spec_resource_external_dependencyPgResource);
          args.apply($insert);
          return object({
            result: $insert
          });
        },
        args: {
          input: applyInputToInsert
        }
      },
      createOrganization: {
        plan(...planParams) {
          const smartPlan = (...overrideParams) => {
              const args = [...overrideParams.concat(planParams.slice(overrideParams.length))],
                $prev = oldPlan5.apply(this, args);
              if (!($prev instanceof ExecutableStep)) {
                console.error(`Wrapped a plan function at Mutation.createOrganization, but that function did not return a step!
${String(oldPlan5)}`);
                throw Error("Wrapped a plan function, but that function did not return a step!");
              }
              args[1].autoApply($prev);
              return $prev;
            },
            [$source, fieldArgs, info] = planParams,
            $newPlan = planWrapper5(smartPlan, $source, fieldArgs, info);
          if ($newPlan === void 0) throw Error("Your plan wrapper didn't return anything; it must return a step or null!");
          if ($newPlan !== null && !isStep($newPlan)) throw Error(`Your plan wrapper returned something other than a step... It must return a step (or null). (Returned: ${inspect($newPlan)})`);
          return $newPlan;
        },
        args: {
          input: applyInputToInsert
        }
      },
      createPullRequest: {
        plan(...planParams) {
          const smartPlan = (...overrideParams) => {
              const args = [...overrideParams.concat(planParams.slice(overrideParams.length))],
                $prev = oldPlan8.apply(this, args);
              if (!($prev instanceof ExecutableStep)) {
                console.error(`Wrapped a plan function at Mutation.createPullRequest, but that function did not return a step!
${String(oldPlan8)}`);
                throw Error("Wrapped a plan function, but that function did not return a step!");
              }
              args[1].autoApply($prev);
              return $prev;
            },
            [$source, fieldArgs, info] = planParams,
            $newPlan = planWrapper9(smartPlan, $source, fieldArgs, info);
          if ($newPlan === void 0) throw Error("Your plan wrapper didn't return anything; it must return a step or null!");
          if ($newPlan !== null && !isStep($newPlan)) throw Error(`Your plan wrapper returned something other than a step... It must return a step (or null). (Returned: ${inspect($newPlan)})`);
          return $newPlan;
        },
        args: {
          input: applyInputToInsert
        }
      },
      createPullRequestComment: {
        plan(...planParams) {
          const smartPlan = (...overrideParams) => {
              const args = [...overrideParams.concat(planParams.slice(overrideParams.length))],
                $prev = oldPlan4.apply(this, args);
              if (!($prev instanceof ExecutableStep)) {
                console.error(`Wrapped a plan function at Mutation.createPullRequestComment, but that function did not return a step!
${String(oldPlan4)}`);
                throw Error("Wrapped a plan function, but that function did not return a step!");
              }
              args[1].autoApply($prev);
              return $prev;
            },
            [$source, fieldArgs, info] = planParams,
            $newPlan = planWrapper4(smartPlan, $source, fieldArgs, info);
          if ($newPlan === void 0) throw Error("Your plan wrapper didn't return anything; it must return a step or null!");
          if ($newPlan !== null && !isStep($newPlan)) throw Error(`Your plan wrapper returned something other than a step... It must return a step (or null). (Returned: ${inspect($newPlan)})`);
          return $newPlan;
        },
        args: {
          input: applyInputToInsert
        }
      },
      createPullRequestReview: {
        plan(...planParams) {
          const smartPlan = (...overrideParams) => {
              const args = [...overrideParams.concat(planParams.slice(overrideParams.length))],
                $prev = oldPlan2.apply(this, args);
              if (!($prev instanceof ExecutableStep)) {
                console.error(`Wrapped a plan function at Mutation.createPullRequestReview, but that function did not return a step!
${String(oldPlan2)}`);
                throw Error("Wrapped a plan function, but that function did not return a step!");
              }
              args[1].autoApply($prev);
              return $prev;
            },
            [$source, fieldArgs, info] = planParams,
            $newPlan = planWrapper2(smartPlan, $source, fieldArgs, info);
          if ($newPlan === void 0) throw Error("Your plan wrapper didn't return anything; it must return a step or null!");
          if ($newPlan !== null && !isStep($newPlan)) throw Error(`Your plan wrapper returned something other than a step... It must return a step (or null). (Returned: ${inspect($newPlan)})`);
          return $newPlan;
        },
        args: {
          input: applyInputToInsert
        }
      },
      createRef(_$root, fieldArgs) {
        const $input = fieldArgs.getRaw("input"),
          $db = context().get("db"),
          $observer = context().get("observer");
        return lambda(object({
          input: $input,
          db: $db,
          observer: $observer
        }), async args => {
          const {
            input,
            db,
            observer
          } = args;
          if (!observer) return {
            ref: null,
            error: "Unauthorized"
          };
          const {
            repositoryId,
            name,
            oid
          } = input;
          if (!name.startsWith("refs/heads/") && !name.startsWith("refs/tags/")) return {
            ref: null,
            error: "Ref name must start with refs/heads/ or refs/tags/"
          };
          const repository = await db.query.repositoryTable.findFirst({
            where(table, {
              eq
            }) {
              return eq(table.id, repositoryId);
            },
            with: {
              owner: !0,
              organization: !0,
              collaborators: {
                where(table, {
                  eq
                }) {
                  return eq(table.userId, observer.id);
                }
              }
            }
          });
          if (!repository) return {
            ref: null,
            error: "Repository not found"
          };
          const isOwner = repository.ownerId === observer.id,
            hasWriteAccess = repository.collaborators?.some(c => c.permission === "admin" || c.permission === "write");
          if (!isOwner && !hasWriteAccess) return {
            ref: null,
            error: "Unauthorized"
          };
          const ownerSlug = repository.organization?.slug || repository.owner?.username;
          if (!ownerSlug) return {
            ref: null,
            error: "Invalid owner"
          };
          if (!(await repositoryService.exists(ownerSlug, repository.slug))) return {
            ref: null,
            error: "Repository not initialized"
          };
          let prefix, shortName;
          if (name.startsWith("refs/heads/")) {
            prefix = "refs/heads/";
            shortName = name.slice(11);
          } else {
            prefix = "refs/tags/";
            shortName = name.slice(10);
          }
          if (!(await gitService.createBranch(ownerSlug, repository.slug, shortName, oid))) return {
            ref: null,
            error: "Failed to create ref"
          };
          const sha = await gitService.resolveRef(ownerSlug, repository.slug, name);
          lib_providers.emit({
            type: "arbor.ref.created",
            data: {
              repositoryId,
              ref: name,
              oid: sha || oid
            },
            organizationId: repository.organizationId || repository.ownerId,
            subject: repositoryId
          }).catch(err => console.warn("[arbor] Event emit failed", err));
          return {
            ref: {
              prefix,
              name: shortName,
              sha: sha || oid,
              owner: ownerSlug,
              repo: repository.slug
            },
            error: null
          };
        });
      },
      createRepository: {
        plan(...planParams) {
          const smartPlan = (...overrideParams) => {
              const args = [...overrideParams.concat(planParams.slice(overrideParams.length))],
                $prev = oldPlan6.apply(this, args);
              if (!($prev instanceof ExecutableStep)) {
                console.error(`Wrapped a plan function at Mutation.createRepository, but that function did not return a step!
${String(oldPlan6)}`);
                throw Error("Wrapped a plan function, but that function did not return a step!");
              }
              args[1].autoApply($prev);
              return $prev;
            },
            [$source, fieldArgs, info] = planParams,
            $newPlan = planWrapper7(smartPlan, $source, fieldArgs, info);
          if ($newPlan === void 0) throw Error("Your plan wrapper didn't return anything; it must return a step or null!");
          if ($newPlan !== null && !isStep($newPlan)) throw Error(`Your plan wrapper returned something other than a step... It must return a step (or null). (Returned: ${inspect($newPlan)})`);
          return $newPlan;
        },
        args: {
          input: applyInputToInsert
        }
      },
      createRepositoryCollaborator: {
        plan(...planParams) {
          const smartPlan = (...overrideParams) => {
              const args = [...overrideParams.concat(planParams.slice(overrideParams.length))],
                $prev = oldPlan.apply(this, args);
              if (!($prev instanceof ExecutableStep)) {
                console.error(`Wrapped a plan function at Mutation.createRepositoryCollaborator, but that function did not return a step!
${String(oldPlan)}`);
                throw Error("Wrapped a plan function, but that function did not return a step!");
              }
              args[1].autoApply($prev);
              return $prev;
            },
            [$source, fieldArgs, info] = planParams,
            $newPlan = planWrapper(smartPlan, $source, fieldArgs, info);
          if ($newPlan === void 0) throw Error("Your plan wrapper didn't return anything; it must return a step or null!");
          if ($newPlan !== null && !isStep($newPlan)) throw Error(`Your plan wrapper returned something other than a step... It must return a step (or null). (Returned: ${inspect($newPlan)})`);
          return $newPlan;
        },
        args: {
          input: applyInputToInsert
        }
      },
      createRepositoryRelationship: {
        plan(_, args) {
          const $insert = pgInsertSingle(spec_resource_repository_relationshipPgResource);
          args.apply($insert);
          return object({
            result: $insert
          });
        },
        args: {
          input: applyInputToInsert
        }
      },
      createRepositoryRelationshipMetadatum: {
        plan(_, args) {
          const $insert = pgInsertSingle(spec_resource_repository_relationship_metadataPgResource);
          args.apply($insert);
          return object({
            result: $insert
          });
        },
        args: {
          input: applyInputToInsert
        }
      },
      createRepositoryRelationshipType: {
        plan(_, args) {
          const $insert = pgInsertSingle(spec_resource_repository_relationship_typePgResource);
          args.apply($insert);
          return object({
            result: $insert
          });
        },
        args: {
          input: applyInputToInsert
        }
      },
      createRepositoryWithGit(_$root, fieldArgs) {
        const $input = fieldArgs.getRaw("input"),
          $db = context().get("db"),
          $observer = context().get("observer"),
          $organizations = context().get("organizations");
        return lambda(object({
          input: $input,
          db: $db,
          observer: $observer,
          organizations: $organizations
        }), async args => {
          const {
            input,
            db,
            observer,
            organizations
          } = args;
          if (!observer) return {
            repository: null,
            error: "Unauthorized"
          };
          const {
            name,
            slug,
            description,
            visibility = "public",
            defaultBranch = "master",
            organizationId
          } = input;
          if (organizationId) {
            const organization = await db.query.organizationTable.findFirst({
              where(table, {
                eq
              }) {
                return eq(table.id, organizationId);
              },
              with: {
                repositories: !0
              }
            });
            if (!organization) return {
              repository: null,
              error: "Organization not found"
            };
            if (!organizations?.some(org => org.id === organization.idpOrganizationId)) return {
              repository: null,
              error: "Unauthorized"
            };
            if (visibility === "private") {
              const privateRepoCount = organization.repositories.filter(repo => repo.visibility === "private").length;
              if (!(await isWithinLimit({
                organizationId
              }, FEATURE_KEYS.MAX_PRIVATE_REPOS, privateRepoCount, billingBypassOrgIds))) return {
                repository: null,
                error: "Maximum number of private repositories reached for your plan"
              };
            }
          }
          const [repository] = await db.insert(repositoryTable).values({
            name,
            slug,
            description,
            visibility,
            defaultBranch,
            ownerId: observer.id,
            organizationId: organizationId || null
          }).returning();
          if (!repository) return {
            rowId: null,
            slug: null,
            ownerUsername: null,
            organizationSlug: null,
            error: "Failed to create repository"
          };
          const fullRepository = await db.query.repositoryTable.findFirst({
            where(table, {
              eq
            }) {
              return eq(table.id, repository.id);
            },
            with: {
              owner: !0,
              organization: !0
            }
          });
          if (!fullRepository) return {
            rowId: null,
            slug: null,
            ownerUsername: null,
            organizationSlug: null,
            error: "Failed to fetch repository"
          };
          const ownerSlug = fullRepository.organization?.slug ?? fullRepository.owner?.username;
          if (!ownerSlug) return {
            rowId: null,
            slug: null,
            ownerUsername: null,
            organizationSlug: null,
            error: "Invalid owner"
          };
          if (!(await repositoryService.init(ownerSlug, fullRepository.slug))) return {
            rowId: null,
            slug: null,
            ownerUsername: null,
            organizationSlug: null,
            error: "Failed to initialize git repository"
          };
          lib_providers.emit({
            type: "arbor.repository.created",
            data: {
              repositoryId: fullRepository.id,
              name,
              slug,
              visibility,
              ownerId: observer.id,
              organizationId: organizationId || null
            },
            organizationId: organizationId || observer.id,
            subject: fullRepository.id
          }).catch(err => console.warn("[arbor] Event emit failed", err));
          return {
            rowId: fullRepository.id,
            slug: fullRepository.slug,
            ownerUsername: fullRepository.owner?.username ?? null,
            organizationSlug: fullRepository.organization?.slug ?? null,
            error: null
          };
        });
      },
      createUser: {
        plan(...planParams) {
          const smartPlan = (...overrideParams) => {
              const args = [...overrideParams.concat(planParams.slice(overrideParams.length))],
                $prev = oldPlan3.apply(this, args);
              if (!($prev instanceof ExecutableStep)) {
                console.error(`Wrapped a plan function at Mutation.createUser, but that function did not return a step!
${String(oldPlan3)}`);
                throw Error("Wrapped a plan function, but that function did not return a step!");
              }
              args[1].autoApply($prev);
              return $prev;
            },
            [$source, fieldArgs, info] = planParams,
            $newPlan = planWrapper3(smartPlan, $source, fieldArgs, info);
          if ($newPlan === void 0) throw Error("Your plan wrapper didn't return anything; it must return a step or null!");
          if ($newPlan !== null && !isStep($newPlan)) throw Error(`Your plan wrapper returned something other than a step... It must return a step (or null). (Returned: ${inspect($newPlan)})`);
          return $newPlan;
        },
        args: {
          input: applyInputToInsert
        }
      },
      deleteExternalDependency: {
        plan(_$root, args) {
          const $delete = pgDeleteSingle(spec_resource_external_dependencyPgResource, {
            id: args.getRaw(['input', "rowId"])
          });
          args.apply($delete);
          return object({
            result: $delete
          });
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      },
      deleteExternalDependencyById: {
        plan(_$root, args) {
          const $delete = pgDeleteSingle(spec_resource_external_dependencyPgResource, specFromArgs_ExternalDependency(args));
          args.apply($delete);
          return object({
            result: $delete
          });
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      },
      deleteOrganization: {
        plan(...planParams) {
          const smartPlan = (...overrideParams) => {
              const args = [...overrideParams.concat(planParams.slice(overrideParams.length))],
                $prev = oldPlan23.apply(this, args);
              if (!($prev instanceof ExecutableStep)) {
                console.error(`Wrapped a plan function at Mutation.deleteOrganization, but that function did not return a step!
${String(oldPlan23)}`);
                throw Error("Wrapped a plan function, but that function did not return a step!");
              }
              args[1].autoApply($prev);
              return $prev;
            },
            [$source, fieldArgs, info] = planParams,
            $newPlan = planWrapper23(smartPlan, $source, fieldArgs, info);
          if ($newPlan === void 0) throw Error("Your plan wrapper didn't return anything; it must return a step or null!");
          if ($newPlan !== null && !isStep($newPlan)) throw Error(`Your plan wrapper returned something other than a step... It must return a step (or null). (Returned: ${inspect($newPlan)})`);
          return $newPlan;
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      },
      deleteOrganizationById: {
        plan(_$root, args) {
          const $delete = pgDeleteSingle(spec_resource_organizationPgResource, specFromArgs_Organization(args));
          args.apply($delete);
          return object({
            result: $delete
          });
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      },
      deletePullRequest: {
        plan(...planParams) {
          const smartPlan = (...overrideParams) => {
              const args = [...overrideParams.concat(planParams.slice(overrideParams.length))],
                $prev = oldPlan26.apply(this, args);
              if (!($prev instanceof ExecutableStep)) {
                console.error(`Wrapped a plan function at Mutation.deletePullRequest, but that function did not return a step!
${String(oldPlan26)}`);
                throw Error("Wrapped a plan function, but that function did not return a step!");
              }
              args[1].autoApply($prev);
              return $prev;
            },
            [$source, fieldArgs, info] = planParams,
            $newPlan = planWrapper27(smartPlan, $source, fieldArgs, info);
          if ($newPlan === void 0) throw Error("Your plan wrapper didn't return anything; it must return a step or null!");
          if ($newPlan !== null && !isStep($newPlan)) throw Error(`Your plan wrapper returned something other than a step... It must return a step (or null). (Returned: ${inspect($newPlan)})`);
          return $newPlan;
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      },
      deletePullRequestById: {
        plan(_$root, args) {
          const $delete = pgDeleteSingle(spec_resource_pull_requestPgResource, specFromArgs_PullRequest(args));
          args.apply($delete);
          return object({
            result: $delete
          });
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      },
      deletePullRequestComment: {
        plan(...planParams) {
          const smartPlan = (...overrideParams) => {
              const args = [...overrideParams.concat(planParams.slice(overrideParams.length))],
                $prev = oldPlan22.apply(this, args);
              if (!($prev instanceof ExecutableStep)) {
                console.error(`Wrapped a plan function at Mutation.deletePullRequestComment, but that function did not return a step!
${String(oldPlan22)}`);
                throw Error("Wrapped a plan function, but that function did not return a step!");
              }
              args[1].autoApply($prev);
              return $prev;
            },
            [$source, fieldArgs, info] = planParams,
            $newPlan = planWrapper22(smartPlan, $source, fieldArgs, info);
          if ($newPlan === void 0) throw Error("Your plan wrapper didn't return anything; it must return a step or null!");
          if ($newPlan !== null && !isStep($newPlan)) throw Error(`Your plan wrapper returned something other than a step... It must return a step (or null). (Returned: ${inspect($newPlan)})`);
          return $newPlan;
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      },
      deletePullRequestCommentById: {
        plan(_$root, args) {
          const $delete = pgDeleteSingle(spec_resource_pull_request_commentPgResource, specFromArgs_PullRequestComment(args));
          args.apply($delete);
          return object({
            result: $delete
          });
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      },
      deletePullRequestReview: {
        plan(...planParams) {
          const smartPlan = (...overrideParams) => {
              const args = [...overrideParams.concat(planParams.slice(overrideParams.length))],
                $prev = oldPlan20.apply(this, args);
              if (!($prev instanceof ExecutableStep)) {
                console.error(`Wrapped a plan function at Mutation.deletePullRequestReview, but that function did not return a step!
${String(oldPlan20)}`);
                throw Error("Wrapped a plan function, but that function did not return a step!");
              }
              args[1].autoApply($prev);
              return $prev;
            },
            [$source, fieldArgs, info] = planParams,
            $newPlan = planWrapper20(smartPlan, $source, fieldArgs, info);
          if ($newPlan === void 0) throw Error("Your plan wrapper didn't return anything; it must return a step or null!");
          if ($newPlan !== null && !isStep($newPlan)) throw Error(`Your plan wrapper returned something other than a step... It must return a step (or null). (Returned: ${inspect($newPlan)})`);
          return $newPlan;
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      },
      deletePullRequestReviewById: {
        plan(_$root, args) {
          const $delete = pgDeleteSingle(spec_resource_pull_request_reviewPgResource, specFromArgs_PullRequestReview(args));
          args.apply($delete);
          return object({
            result: $delete
          });
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      },
      deleteRef(_$root, fieldArgs) {
        const $input = fieldArgs.getRaw("input"),
          $db = context().get("db"),
          $observer = context().get("observer");
        return lambda(object({
          input: $input,
          db: $db,
          observer: $observer
        }), async args => {
          const {
            input,
            db,
            observer
          } = args;
          if (!observer) return {
            success: !1,
            error: "Unauthorized"
          };
          const {
            repositoryId,
            name
          } = input;
          if (!name.startsWith("refs/heads/") && !name.startsWith("refs/tags/")) return {
            success: !1,
            error: "Ref name must start with refs/heads/ or refs/tags/"
          };
          const repository = await db.query.repositoryTable.findFirst({
            where(table, {
              eq
            }) {
              return eq(table.id, repositoryId);
            },
            with: {
              owner: !0,
              organization: !0,
              collaborators: {
                where(table, {
                  eq
                }) {
                  return eq(table.userId, observer.id);
                }
              }
            }
          });
          if (!repository) return {
            success: !1,
            error: "Repository not found"
          };
          const isOwner = repository.ownerId === observer.id,
            hasWriteAccess = repository.collaborators?.some(c => c.permission === "admin" || c.permission === "write");
          if (!isOwner && !hasWriteAccess) return {
            success: !1,
            error: "Unauthorized"
          };
          const ownerSlug = repository.organization?.slug || repository.owner?.username;
          if (!ownerSlug) return {
            success: !1,
            error: "Invalid owner"
          };
          if (!(await repositoryService.exists(ownerSlug, repository.slug))) return {
            success: !1,
            error: "Repository not initialized"
          };
          const shortName = name.startsWith("refs/heads/") ? name.slice(11) : name.slice(10);
          if (name.startsWith("refs/heads/") && shortName === repository.defaultBranch) return {
            success: !1,
            error: "Cannot delete the default branch"
          };
          if (!(await gitService.deleteBranch(ownerSlug, repository.slug, shortName))) return {
            success: !1,
            error: "Failed to delete ref"
          };
          lib_providers.emit({
            type: "arbor.ref.deleted",
            data: {
              repositoryId,
              ref: name
            },
            organizationId: repository.organizationId || repository.ownerId,
            subject: repositoryId
          }).catch(err => console.warn("[arbor] Event emit failed", err));
          return {
            success: !0,
            error: null
          };
        });
      },
      deleteRepository: {
        plan(...planParams) {
          const smartPlan = (...overrideParams) => {
              const args = [...overrideParams.concat(planParams.slice(overrideParams.length))],
                $prev = oldPlan24.apply(this, args);
              if (!($prev instanceof ExecutableStep)) {
                console.error(`Wrapped a plan function at Mutation.deleteRepository, but that function did not return a step!
${String(oldPlan24)}`);
                throw Error("Wrapped a plan function, but that function did not return a step!");
              }
              args[1].autoApply($prev);
              return $prev;
            },
            [$source, fieldArgs, info] = planParams,
            $newPlan = planWrapper25(smartPlan, $source, fieldArgs, info);
          if ($newPlan === void 0) throw Error("Your plan wrapper didn't return anything; it must return a step or null!");
          if ($newPlan !== null && !isStep($newPlan)) throw Error(`Your plan wrapper returned something other than a step... It must return a step (or null). (Returned: ${inspect($newPlan)})`);
          return $newPlan;
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      },
      deleteRepositoryById: {
        plan(_$root, args) {
          const $delete = pgDeleteSingle(spec_resource_repositoryPgResource, specFromArgs_Repository(args));
          args.apply($delete);
          return object({
            result: $delete
          });
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      },
      deleteRepositoryCollaborator: {
        plan(...planParams) {
          const smartPlan = (...overrideParams) => {
              const args = [...overrideParams.concat(planParams.slice(overrideParams.length))],
                $prev = oldPlan19.apply(this, args);
              if (!($prev instanceof ExecutableStep)) {
                console.error(`Wrapped a plan function at Mutation.deleteRepositoryCollaborator, but that function did not return a step!
${String(oldPlan19)}`);
                throw Error("Wrapped a plan function, but that function did not return a step!");
              }
              args[1].autoApply($prev);
              return $prev;
            },
            [$source, fieldArgs, info] = planParams,
            $newPlan = planWrapper19(smartPlan, $source, fieldArgs, info);
          if ($newPlan === void 0) throw Error("Your plan wrapper didn't return anything; it must return a step or null!");
          if ($newPlan !== null && !isStep($newPlan)) throw Error(`Your plan wrapper returned something other than a step... It must return a step (or null). (Returned: ${inspect($newPlan)})`);
          return $newPlan;
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      },
      deleteRepositoryCollaboratorById: {
        plan(_$root, args) {
          const $delete = pgDeleteSingle(spec_resource_repository_collaboratorPgResource, specFromArgs_RepositoryCollaborator(args));
          args.apply($delete);
          return object({
            result: $delete
          });
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      },
      deleteRepositoryRelationship: {
        plan(_$root, args) {
          const $delete = pgDeleteSingle(spec_resource_repository_relationshipPgResource, {
            id: args.getRaw(['input', "rowId"])
          });
          args.apply($delete);
          return object({
            result: $delete
          });
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      },
      deleteRepositoryRelationshipById: {
        plan(_$root, args) {
          const $delete = pgDeleteSingle(spec_resource_repository_relationshipPgResource, specFromArgs_RepositoryRelationship(args));
          args.apply($delete);
          return object({
            result: $delete
          });
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      },
      deleteRepositoryRelationshipMetadatum: {
        plan(_$root, args) {
          const $delete = pgDeleteSingle(spec_resource_repository_relationship_metadataPgResource, {
            id: args.getRaw(['input', "rowId"])
          });
          args.apply($delete);
          return object({
            result: $delete
          });
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      },
      deleteRepositoryRelationshipMetadatumById: {
        plan(_$root, args) {
          const $delete = pgDeleteSingle(spec_resource_repository_relationship_metadataPgResource, specFromArgs_RepositoryRelationshipMetadatum(args));
          args.apply($delete);
          return object({
            result: $delete
          });
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      },
      deleteRepositoryRelationshipType: {
        plan(_$root, args) {
          const $delete = pgDeleteSingle(spec_resource_repository_relationship_typePgResource, {
            id: args.getRaw(['input', "rowId"])
          });
          args.apply($delete);
          return object({
            result: $delete
          });
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      },
      deleteRepositoryRelationshipTypeById: {
        plan(_$root, args) {
          const $delete = pgDeleteSingle(spec_resource_repository_relationship_typePgResource, specFromArgs_RepositoryRelationshipType(args));
          args.apply($delete);
          return object({
            result: $delete
          });
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      },
      deleteUser: {
        plan(...planParams) {
          const smartPlan = (...overrideParams) => {
              const args = [...overrideParams.concat(planParams.slice(overrideParams.length))],
                $prev = oldPlan21.apply(this, args);
              if (!($prev instanceof ExecutableStep)) {
                console.error(`Wrapped a plan function at Mutation.deleteUser, but that function did not return a step!
${String(oldPlan21)}`);
                throw Error("Wrapped a plan function, but that function did not return a step!");
              }
              args[1].autoApply($prev);
              return $prev;
            },
            [$source, fieldArgs, info] = planParams,
            $newPlan = planWrapper21(smartPlan, $source, fieldArgs, info);
          if ($newPlan === void 0) throw Error("Your plan wrapper didn't return anything; it must return a step or null!");
          if ($newPlan !== null && !isStep($newPlan)) throw Error(`Your plan wrapper returned something other than a step... It must return a step (or null). (Returned: ${inspect($newPlan)})`);
          return $newPlan;
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      },
      deleteUserById: {
        plan(_$root, args) {
          const $delete = pgDeleteSingle(spec_resource_userPgResource, specFromArgs_User(args));
          args.apply($delete);
          return object({
            result: $delete
          });
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      },
      initializeRepository(_$root, fieldArgs) {
        const $input = fieldArgs.getRaw("input"),
          $db = context().get("db"),
          $observer = context().get("observer");
        return lambda(object({
          input: $input,
          db: $db,
          observer: $observer
        }), async args => {
          const {
            input,
            db,
            observer
          } = args;
          if (!observer) return {
            success: !1,
            repository: null,
            error: "Unauthorized"
          };
          const {
              repositoryId
            } = input,
            repository = await db.query.repositoryTable.findFirst({
              where(table, {
                eq
              }) {
                return eq(table.id, repositoryId);
              },
              with: {
                owner: !0,
                organization: !0,
                collaborators: {
                  where(table, {
                    eq
                  }) {
                    return eq(table.userId, observer.id);
                  }
                }
              }
            });
          if (!repository) return {
            success: !1,
            repository: null,
            error: "Repository not found"
          };
          const isOwner = repository.ownerId === observer.id,
            isAdmin = repository.collaborators?.some(c => c.permission === "admin");
          if (!isOwner && !isAdmin) return {
            success: !1,
            repository: null,
            error: "Unauthorized"
          };
          const ownerSlug = repository.organization?.slug || repository.owner?.username;
          if (!ownerSlug) return {
            success: !1,
            repository: null,
            error: "Invalid owner"
          };
          if (!(await repositoryService.init(ownerSlug, repository.slug))) return {
            success: !1,
            repository: null,
            error: "Failed to initialize repository"
          };
          return {
            success: !0,
            repository,
            error: null
          };
        });
      },
      mergePullRequest(_$root, fieldArgs) {
        const $input = fieldArgs.getRaw("input"),
          $db = context().get("db"),
          $observer = context().get("observer");
        return lambda(object({
          input: $input,
          db: $db,
          observer: $observer
        }), async args => {
          const {
            input,
            db,
            observer
          } = args;
          if (!observer) return {
            success: !1,
            mergeCommitSha: null,
            error: "Unauthorized"
          };
          const {
              pullRequestId,
              commitMessage
            } = input,
            pullRequest = await db.query.pullRequestTable.findFirst({
              where(table, {
                eq
              }) {
                return eq(table.id, pullRequestId);
              },
              with: {
                repository: {
                  with: {
                    owner: !0,
                    organization: !0,
                    collaborators: {
                      where(table, {
                        eq
                      }) {
                        return eq(table.userId, observer.id);
                      }
                    }
                  }
                },
                author: !0
              }
            });
          if (!pullRequest) return {
            success: !1,
            mergeCommitSha: null,
            error: "Pull request not found"
          };
          if (pullRequest.state !== "open") return {
            success: !1,
            mergeCommitSha: null,
            error: `Pull request is ${pullRequest.state}, not open`
          };
          const repository = pullRequest.repository,
            isOwner = repository.ownerId === observer.id,
            hasWriteAccess = repository.collaborators?.some(c => c.permission === "admin" || c.permission === "write");
          if (!isOwner && !hasWriteAccess) return {
            success: !1,
            mergeCommitSha: null,
            error: "Unauthorized - requires write access"
          };
          const ownerSlug = repository.organization?.slug || repository.owner?.username;
          if (!ownerSlug) return {
            success: !1,
            mergeCommitSha: null,
            error: "Invalid repository owner"
          };
          if (!(await repositoryService.exists(ownerSlug, repository.slug))) return {
            success: !1,
            mergeCommitSha: null,
            error: "Repository not initialized"
          };
          const defaultMessage = `Merge pull request #${pullRequest.number} from ${pullRequest.sourceBranch}

${pullRequest.title}`,
            mergeMessage = commitMessage || defaultMessage,
            mergeResult = await gitService.merge(ownerSlug, repository.slug, pullRequest.sourceBranch, pullRequest.targetBranch, {
              name: observer.username || observer.email || "Unknown",
              email: observer.email || "unknown@arbor.dev"
            }, mergeMessage);
          if (!mergeResult.sha) return {
            success: !1,
            mergeCommitSha: null,
            error: mergeResult.error || "Merge failed"
          };
          const now = new Date();
          await dbPool.update(pullRequestTable).set({
            state: "merged",
            mergeCommitSha: mergeResult.sha,
            mergedAt: now,
            mergedById: observer.id,
            updatedAt: now.toISOString()
          }).where(eq(pullRequestTable.id, pullRequestId));
          lib_providers.emit({
            type: "arbor.pull_request.merged",
            data: {
              pullRequestId,
              mergeCommitSha: mergeResult.sha,
              repositoryId: repository.id,
              sourceBranch: pullRequest.sourceBranch,
              targetBranch: pullRequest.targetBranch
            },
            organizationId: repository.organizationId || repository.ownerId,
            subject: pullRequestId
          }).catch(err => console.warn("[arbor] Event emit failed", err));
          return {
            success: !0,
            mergeCommitSha: mergeResult.sha,
            error: null
          };
        });
      },
      updateExternalDependency: {
        plan(_$root, args) {
          const $update = pgUpdateSingle(spec_resource_external_dependencyPgResource, {
            id: args.getRaw(['input', "rowId"])
          });
          args.apply($update);
          return object({
            result: $update
          });
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      },
      updateExternalDependencyById: {
        plan(_$root, args) {
          const $update = pgUpdateSingle(spec_resource_external_dependencyPgResource, specFromArgs_ExternalDependency(args));
          args.apply($update);
          return object({
            result: $update
          });
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      },
      updateOrganization: {
        plan(...planParams) {
          const smartPlan = (...overrideParams) => {
              const args = [...overrideParams.concat(planParams.slice(overrideParams.length))],
                $prev = oldPlan14.apply(this, args);
              if (!($prev instanceof ExecutableStep)) {
                console.error(`Wrapped a plan function at Mutation.updateOrganization, but that function did not return a step!
${String(oldPlan14)}`);
                throw Error("Wrapped a plan function, but that function did not return a step!");
              }
              args[1].autoApply($prev);
              return $prev;
            },
            [$source, fieldArgs, info] = planParams,
            $newPlan = planWrapper14(smartPlan, $source, fieldArgs, info);
          if ($newPlan === void 0) throw Error("Your plan wrapper didn't return anything; it must return a step or null!");
          if ($newPlan !== null && !isStep($newPlan)) throw Error(`Your plan wrapper returned something other than a step... It must return a step (or null). (Returned: ${inspect($newPlan)})`);
          return $newPlan;
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      },
      updateOrganizationById: {
        plan(_$root, args) {
          const $update = pgUpdateSingle(spec_resource_organizationPgResource, specFromArgs_Organization(args));
          args.apply($update);
          return object({
            result: $update
          });
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      },
      updatePullRequest: {
        plan(...planParams) {
          const smartPlan = (...overrideParams) => {
              const args = [...overrideParams.concat(planParams.slice(overrideParams.length))],
                $prev = oldPlan17.apply(this, args);
              if (!($prev instanceof ExecutableStep)) {
                console.error(`Wrapped a plan function at Mutation.updatePullRequest, but that function did not return a step!
${String(oldPlan17)}`);
                throw Error("Wrapped a plan function, but that function did not return a step!");
              }
              args[1].autoApply($prev);
              return $prev;
            },
            [$source, fieldArgs, info] = planParams,
            $newPlan = planWrapper9(smartPlan, $source, fieldArgs, info);
          if ($newPlan === void 0) throw Error("Your plan wrapper didn't return anything; it must return a step or null!");
          if ($newPlan !== null && !isStep($newPlan)) throw Error(`Your plan wrapper returned something other than a step... It must return a step (or null). (Returned: ${inspect($newPlan)})`);
          return $newPlan;
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      },
      updatePullRequestById: {
        plan(_$root, args) {
          const $update = pgUpdateSingle(spec_resource_pull_requestPgResource, specFromArgs_PullRequest(args));
          args.apply($update);
          return object({
            result: $update
          });
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      },
      updatePullRequestComment: {
        plan(...planParams) {
          const smartPlan = (...overrideParams) => {
              const args = [...overrideParams.concat(planParams.slice(overrideParams.length))],
                $prev = oldPlan13.apply(this, args);
              if (!($prev instanceof ExecutableStep)) {
                console.error(`Wrapped a plan function at Mutation.updatePullRequestComment, but that function did not return a step!
${String(oldPlan13)}`);
                throw Error("Wrapped a plan function, but that function did not return a step!");
              }
              args[1].autoApply($prev);
              return $prev;
            },
            [$source, fieldArgs, info] = planParams,
            $newPlan = planWrapper13(smartPlan, $source, fieldArgs, info);
          if ($newPlan === void 0) throw Error("Your plan wrapper didn't return anything; it must return a step or null!");
          if ($newPlan !== null && !isStep($newPlan)) throw Error(`Your plan wrapper returned something other than a step... It must return a step (or null). (Returned: ${inspect($newPlan)})`);
          return $newPlan;
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      },
      updatePullRequestCommentById: {
        plan(_$root, args) {
          const $update = pgUpdateSingle(spec_resource_pull_request_commentPgResource, specFromArgs_PullRequestComment(args));
          args.apply($update);
          return object({
            result: $update
          });
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      },
      updatePullRequestReview: {
        plan(...planParams) {
          const smartPlan = (...overrideParams) => {
              const args = [...overrideParams.concat(planParams.slice(overrideParams.length))],
                $prev = oldPlan11.apply(this, args);
              if (!($prev instanceof ExecutableStep)) {
                console.error(`Wrapped a plan function at Mutation.updatePullRequestReview, but that function did not return a step!
${String(oldPlan11)}`);
                throw Error("Wrapped a plan function, but that function did not return a step!");
              }
              args[1].autoApply($prev);
              return $prev;
            },
            [$source, fieldArgs, info] = planParams,
            $newPlan = planWrapper11(smartPlan, $source, fieldArgs, info);
          if ($newPlan === void 0) throw Error("Your plan wrapper didn't return anything; it must return a step or null!");
          if ($newPlan !== null && !isStep($newPlan)) throw Error(`Your plan wrapper returned something other than a step... It must return a step (or null). (Returned: ${inspect($newPlan)})`);
          return $newPlan;
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      },
      updatePullRequestReviewById: {
        plan(_$root, args) {
          const $update = pgUpdateSingle(spec_resource_pull_request_reviewPgResource, specFromArgs_PullRequestReview(args));
          args.apply($update);
          return object({
            result: $update
          });
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      },
      updateRepository: {
        plan(...planParams) {
          const smartPlan = (...overrideParams) => {
              const args = [...overrideParams.concat(planParams.slice(overrideParams.length))],
                $prev = oldPlan15.apply(this, args);
              if (!($prev instanceof ExecutableStep)) {
                console.error(`Wrapped a plan function at Mutation.updateRepository, but that function did not return a step!
${String(oldPlan15)}`);
                throw Error("Wrapped a plan function, but that function did not return a step!");
              }
              args[1].autoApply($prev);
              return $prev;
            },
            [$source, fieldArgs, info] = planParams,
            $newPlan = planWrapper7(smartPlan, $source, fieldArgs, info);
          if ($newPlan === void 0) throw Error("Your plan wrapper didn't return anything; it must return a step or null!");
          if ($newPlan !== null && !isStep($newPlan)) throw Error(`Your plan wrapper returned something other than a step... It must return a step (or null). (Returned: ${inspect($newPlan)})`);
          return $newPlan;
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      },
      updateRepositoryById: {
        plan(_$root, args) {
          const $update = pgUpdateSingle(spec_resource_repositoryPgResource, specFromArgs_Repository(args));
          args.apply($update);
          return object({
            result: $update
          });
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      },
      updateRepositoryCollaborator: {
        plan(...planParams) {
          const smartPlan = (...overrideParams) => {
              const args = [...overrideParams.concat(planParams.slice(overrideParams.length))],
                $prev = oldPlan10.apply(this, args);
              if (!($prev instanceof ExecutableStep)) {
                console.error(`Wrapped a plan function at Mutation.updateRepositoryCollaborator, but that function did not return a step!
${String(oldPlan10)}`);
                throw Error("Wrapped a plan function, but that function did not return a step!");
              }
              args[1].autoApply($prev);
              return $prev;
            },
            [$source, fieldArgs, info] = planParams,
            $newPlan = planWrapper10(smartPlan, $source, fieldArgs, info);
          if ($newPlan === void 0) throw Error("Your plan wrapper didn't return anything; it must return a step or null!");
          if ($newPlan !== null && !isStep($newPlan)) throw Error(`Your plan wrapper returned something other than a step... It must return a step (or null). (Returned: ${inspect($newPlan)})`);
          return $newPlan;
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      },
      updateRepositoryCollaboratorById: {
        plan(_$root, args) {
          const $update = pgUpdateSingle(spec_resource_repository_collaboratorPgResource, specFromArgs_RepositoryCollaborator(args));
          args.apply($update);
          return object({
            result: $update
          });
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      },
      updateRepositoryRelationship: {
        plan(_$root, args) {
          const $update = pgUpdateSingle(spec_resource_repository_relationshipPgResource, {
            id: args.getRaw(['input', "rowId"])
          });
          args.apply($update);
          return object({
            result: $update
          });
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      },
      updateRepositoryRelationshipById: {
        plan(_$root, args) {
          const $update = pgUpdateSingle(spec_resource_repository_relationshipPgResource, specFromArgs_RepositoryRelationship(args));
          args.apply($update);
          return object({
            result: $update
          });
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      },
      updateRepositoryRelationshipMetadatum: {
        plan(_$root, args) {
          const $update = pgUpdateSingle(spec_resource_repository_relationship_metadataPgResource, {
            id: args.getRaw(['input', "rowId"])
          });
          args.apply($update);
          return object({
            result: $update
          });
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      },
      updateRepositoryRelationshipMetadatumById: {
        plan(_$root, args) {
          const $update = pgUpdateSingle(spec_resource_repository_relationship_metadataPgResource, specFromArgs_RepositoryRelationshipMetadatum(args));
          args.apply($update);
          return object({
            result: $update
          });
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      },
      updateRepositoryRelationshipType: {
        plan(_$root, args) {
          const $update = pgUpdateSingle(spec_resource_repository_relationship_typePgResource, {
            id: args.getRaw(['input', "rowId"])
          });
          args.apply($update);
          return object({
            result: $update
          });
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      },
      updateRepositoryRelationshipTypeById: {
        plan(_$root, args) {
          const $update = pgUpdateSingle(spec_resource_repository_relationship_typePgResource, specFromArgs_RepositoryRelationshipType(args));
          args.apply($update);
          return object({
            result: $update
          });
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      },
      updateUser: {
        plan(...planParams) {
          const smartPlan = (...overrideParams) => {
              const args = [...overrideParams.concat(planParams.slice(overrideParams.length))],
                $prev = oldPlan12.apply(this, args);
              if (!($prev instanceof ExecutableStep)) {
                console.error(`Wrapped a plan function at Mutation.updateUser, but that function did not return a step!
${String(oldPlan12)}`);
                throw Error("Wrapped a plan function, but that function did not return a step!");
              }
              args[1].autoApply($prev);
              return $prev;
            },
            [$source, fieldArgs, info] = planParams,
            $newPlan = planWrapper12(smartPlan, $source, fieldArgs, info);
          if ($newPlan === void 0) throw Error("Your plan wrapper didn't return anything; it must return a step or null!");
          if ($newPlan !== null && !isStep($newPlan)) throw Error(`Your plan wrapper returned something other than a step... It must return a step (or null). (Returned: ${inspect($newPlan)})`);
          return $newPlan;
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      },
      updateUserById: {
        plan(_$root, args) {
          const $update = pgUpdateSingle(spec_resource_userPgResource, specFromArgs_User(args));
          args.apply($update);
          return object({
            result: $update
          });
        },
        args: {
          input: applyInputToUpdateOrDelete
        }
      }
    }
  },
  Blob: {
    plans: {
      byteSize($blob) {
        return lambda($blob, blob => blob?.byteSize ?? 0);
      },
      isBinary($blob) {
        return lambda($blob, blob => blob?.isBinary ?? !1);
      },
      oid($blob) {
        return lambda($blob, blob => blob?.oid ?? null);
      },
      repository($blob) {
        return lambda($blob, blob => {
          const b = blob;
          return b ? {
            owner: b.owner,
            repo: b.repo
          } : null;
        });
      },
      text($blob) {
        return lambda($blob, blob => blob?.text ?? null);
      }
    }
  },
  Commit: {
    plans: {
      author($commit) {
        return lambda($commit, commit => commit?.author ?? null);
      },
      authoredDate($commit) {
        return lambda($commit, commit => {
          const c = commit;
          return c?.author?.timestamp ? new Date(c.author.timestamp * 1000).toISOString() : null;
        });
      },
      committedDate($commit) {
        return lambda($commit, commit => {
          const c = commit;
          return c?.committer?.timestamp ? new Date(c.committer.timestamp * 1000).toISOString() : null;
        });
      },
      committer($commit) {
        return lambda($commit, commit => commit?.committer ?? null);
      },
      history($commit, fieldArgs) {
        const $first = fieldArgs.getRaw("first"),
          $offset = fieldArgs.getRaw("offset");
        return lambda(object({
          commit: $commit,
          first: $first,
          offset: $offset
        }), async args => {
          const {
              commit,
              first,
              offset
            } = args,
            c = commit;
          if (!c) return [];
          const {
            owner,
            repo,
            oid
          } = c;
          return (await gitService.getLog(owner, repo, oid, {
            depth: first ?? 20,
            skip: offset ?? 0
          })).map(cm => ({
            __typename: "Commit",
            owner,
            repo,
            oid: cm.sha,
            message: cm.message,
            author: cm.author,
            committer: cm.committer,
            parents: cm.parents
          }));
        });
      },
      message($commit) {
        return lambda($commit, commit => commit?.message ?? null);
      },
      messageHeadline($commit) {
        return lambda($commit, commit => commit?.message?.split(`
`)[0] ?? "");
      },
      oid($commit) {
        return lambda($commit, commit => commit?.oid ?? null);
      },
      parents($commit) {
        return lambda($commit, async commit => {
          const c = commit;
          if (!c) return [];
          const {
              owner,
              repo,
              parents
            } = c,
            parentCommits = [];
          for (const parentSha of parents || []) {
            const parent = await gitService.getCommit(owner, repo, parentSha);
            if (parent) parentCommits.push({
              __typename: "Commit",
              owner,
              repo,
              oid: parent.sha,
              message: parent.message,
              author: parent.author,
              committer: parent.committer,
              parents: parent.parents
            });
          }
          return parentCommits;
        });
      },
      repository($commit) {
        return lambda($commit, commit => {
          const c = commit;
          return c ? {
            owner: c.owner,
            repo: c.repo
          } : null;
        });
      },
      tree($commit) {
        return lambda($commit, async commit => {
          const c = commit;
          if (!c) return null;
          const {
              owner,
              repo,
              oid
            } = c,
            entries = await gitService.getTree(owner, repo, oid, "");
          return {
            __typename: "Tree",
            owner,
            repo,
            oid,
            entries: entries.map(e => ({
              ...e,
              name: e.path,
              path: e.path,
              owner,
              repo,
              commitOid: oid
            }))
          };
        });
      }
    }
  },
  CreateExternalDependencyPayload: {
    assertStep: assertStep,
    plans: {
      clientMutationId: getClientMutationIdForCreatePlan,
      externalDependency: planCreatePayloadResult,
      externalDependencyEdge: CreateExternalDependencyPayload_externalDependencyEdgePlan,
      query: queryPlan
    }
  },
  CreateOrganizationPayload: {
    assertStep: assertStep,
    plans: {
      clientMutationId: getClientMutationIdForCreatePlan,
      organization: planCreatePayloadResult,
      organizationEdge: CreateOrganizationPayload_organizationEdgePlan,
      query: queryPlan
    }
  },
  CreatePullRequestCommentPayload: {
    assertStep: assertStep,
    plans: {
      clientMutationId: getClientMutationIdForCreatePlan,
      pullRequestComment: planCreatePayloadResult,
      pullRequestCommentEdge: CreatePullRequestCommentPayload_pullRequestCommentEdgePlan,
      query: queryPlan
    }
  },
  CreatePullRequestPayload: {
    assertStep: assertStep,
    plans: {
      clientMutationId: getClientMutationIdForCreatePlan,
      pullRequest: planCreatePayloadResult,
      pullRequestEdge: CreatePullRequestPayload_pullRequestEdgePlan,
      query: queryPlan
    }
  },
  CreatePullRequestReviewPayload: {
    assertStep: assertStep,
    plans: {
      clientMutationId: getClientMutationIdForCreatePlan,
      pullRequestReview: planCreatePayloadResult,
      pullRequestReviewEdge: CreatePullRequestReviewPayload_pullRequestReviewEdgePlan,
      query: queryPlan
    }
  },
  CreateRefPayload: {
    plans: {
      error: InitializeRepositoryPayload_error_plan,
      ref($payload) {
        return lambda($payload, p => p?.ref ?? null);
      }
    }
  },
  CreateRepositoryCollaboratorPayload: {
    assertStep: assertStep,
    plans: {
      clientMutationId: getClientMutationIdForCreatePlan,
      query: queryPlan,
      repositoryCollaborator: planCreatePayloadResult,
      repositoryCollaboratorEdge: CreateRepositoryCollaboratorPayload_repositoryCollaboratorEdgePlan
    }
  },
  CreateRepositoryPayload: {
    assertStep: assertStep,
    plans: {
      clientMutationId: getClientMutationIdForCreatePlan,
      query: queryPlan,
      repository: planCreatePayloadResult,
      repositoryEdge: CreateRepositoryPayload_repositoryEdgePlan
    }
  },
  CreateRepositoryRelationshipMetadatumPayload: {
    assertStep: assertStep,
    plans: {
      clientMutationId: getClientMutationIdForCreatePlan,
      query: queryPlan,
      repositoryRelationshipMetadatum: planCreatePayloadResult,
      repositoryRelationshipMetadatumEdge: CreateRepositoryRelationshipMetadatumPayload_repositoryRelationshipMetadatumEdgePlan
    }
  },
  CreateRepositoryRelationshipPayload: {
    assertStep: assertStep,
    plans: {
      clientMutationId: getClientMutationIdForCreatePlan,
      query: queryPlan,
      repositoryRelationship: planCreatePayloadResult,
      repositoryRelationshipEdge: CreateRepositoryRelationshipPayload_repositoryRelationshipEdgePlan
    }
  },
  CreateRepositoryRelationshipTypePayload: {
    assertStep: assertStep,
    plans: {
      clientMutationId: getClientMutationIdForCreatePlan,
      query: queryPlan,
      repositoryRelationshipType: planCreatePayloadResult,
      repositoryRelationshipTypeEdge: CreateRepositoryRelationshipTypePayload_repositoryRelationshipTypeEdgePlan
    }
  },
  CreateRepositoryWithGitPayload: {
    plans: {
      error: InitializeRepositoryPayload_error_plan,
      organizationSlug($payload) {
        return lambda($payload, p => p?.organizationSlug ?? null);
      },
      ownerUsername($payload) {
        return lambda($payload, p => p?.ownerUsername ?? null);
      },
      rowId($payload) {
        return lambda($payload, p => p?.rowId ?? null);
      },
      slug($payload) {
        return lambda($payload, p => p?.slug ?? null);
      }
    }
  },
  CreateUserPayload: {
    assertStep: assertStep,
    plans: {
      clientMutationId: getClientMutationIdForCreatePlan,
      query: queryPlan,
      user: planCreatePayloadResult,
      userEdge: CreateUserPayload_userEdgePlan
    }
  },
  DeleteExternalDependencyPayload: {
    assertStep: ObjectStep,
    plans: {
      clientMutationId: getClientMutationIdForCreatePlan,
      deletedExternalDependencyId($object) {
        const $record = $object.getStepForKey("result"),
          specifier = nodeIdHandler_ExternalDependency.plan($record);
        return lambda(specifier, base64JSONNodeIdCodec.encode);
      },
      externalDependency: planCreatePayloadResult,
      externalDependencyEdge: CreateExternalDependencyPayload_externalDependencyEdgePlan,
      query: queryPlan
    }
  },
  DeleteOrganizationPayload: {
    assertStep: ObjectStep,
    plans: {
      clientMutationId: getClientMutationIdForCreatePlan,
      deletedOrganizationId($object) {
        const $record = $object.getStepForKey("result"),
          specifier = nodeIdHandler_Organization.plan($record);
        return lambda(specifier, base64JSONNodeIdCodec.encode);
      },
      organization: planCreatePayloadResult,
      organizationEdge: CreateOrganizationPayload_organizationEdgePlan,
      query: queryPlan
    }
  },
  DeletePullRequestCommentPayload: {
    assertStep: ObjectStep,
    plans: {
      clientMutationId: getClientMutationIdForCreatePlan,
      deletedPullRequestCommentId($object) {
        const $record = $object.getStepForKey("result"),
          specifier = nodeIdHandler_PullRequestComment.plan($record);
        return lambda(specifier, base64JSONNodeIdCodec.encode);
      },
      pullRequestComment: planCreatePayloadResult,
      pullRequestCommentEdge: CreatePullRequestCommentPayload_pullRequestCommentEdgePlan,
      query: queryPlan
    }
  },
  DeletePullRequestPayload: {
    assertStep: ObjectStep,
    plans: {
      clientMutationId: getClientMutationIdForCreatePlan,
      deletedPullRequestId($object) {
        const $record = $object.getStepForKey("result"),
          specifier = nodeIdHandler_PullRequest.plan($record);
        return lambda(specifier, base64JSONNodeIdCodec.encode);
      },
      pullRequest: planCreatePayloadResult,
      pullRequestEdge: CreatePullRequestPayload_pullRequestEdgePlan,
      query: queryPlan
    }
  },
  DeletePullRequestReviewPayload: {
    assertStep: ObjectStep,
    plans: {
      clientMutationId: getClientMutationIdForCreatePlan,
      deletedPullRequestReviewId($object) {
        const $record = $object.getStepForKey("result"),
          specifier = nodeIdHandler_PullRequestReview.plan($record);
        return lambda(specifier, base64JSONNodeIdCodec.encode);
      },
      pullRequestReview: planCreatePayloadResult,
      pullRequestReviewEdge: CreatePullRequestReviewPayload_pullRequestReviewEdgePlan,
      query: queryPlan
    }
  },
  DeleteRefPayload: {
    plans: {
      error: InitializeRepositoryPayload_error_plan,
      success: InitializeRepositoryPayload_success_plan
    }
  },
  DeleteRepositoryCollaboratorPayload: {
    assertStep: ObjectStep,
    plans: {
      clientMutationId: getClientMutationIdForCreatePlan,
      deletedRepositoryCollaboratorId($object) {
        const $record = $object.getStepForKey("result"),
          specifier = nodeIdHandler_RepositoryCollaborator.plan($record);
        return lambda(specifier, base64JSONNodeIdCodec.encode);
      },
      query: queryPlan,
      repositoryCollaborator: planCreatePayloadResult,
      repositoryCollaboratorEdge: CreateRepositoryCollaboratorPayload_repositoryCollaboratorEdgePlan
    }
  },
  DeleteRepositoryPayload: {
    assertStep: ObjectStep,
    plans: {
      clientMutationId: getClientMutationIdForCreatePlan,
      deletedRepositoryId($object) {
        const $record = $object.getStepForKey("result"),
          specifier = nodeIdHandler_Repository.plan($record);
        return lambda(specifier, base64JSONNodeIdCodec.encode);
      },
      query: queryPlan,
      repository: planCreatePayloadResult,
      repositoryEdge: CreateRepositoryPayload_repositoryEdgePlan
    }
  },
  DeleteRepositoryRelationshipMetadatumPayload: {
    assertStep: ObjectStep,
    plans: {
      clientMutationId: getClientMutationIdForCreatePlan,
      deletedRepositoryRelationshipMetadatumId($object) {
        const $record = $object.getStepForKey("result"),
          specifier = nodeIdHandler_RepositoryRelationshipMetadatum.plan($record);
        return lambda(specifier, base64JSONNodeIdCodec.encode);
      },
      query: queryPlan,
      repositoryRelationshipMetadatum: planCreatePayloadResult,
      repositoryRelationshipMetadatumEdge: CreateRepositoryRelationshipMetadatumPayload_repositoryRelationshipMetadatumEdgePlan
    }
  },
  DeleteRepositoryRelationshipPayload: {
    assertStep: ObjectStep,
    plans: {
      clientMutationId: getClientMutationIdForCreatePlan,
      deletedRepositoryRelationshipId($object) {
        const $record = $object.getStepForKey("result"),
          specifier = nodeIdHandler_RepositoryRelationship.plan($record);
        return lambda(specifier, base64JSONNodeIdCodec.encode);
      },
      query: queryPlan,
      repositoryRelationship: planCreatePayloadResult,
      repositoryRelationshipEdge: CreateRepositoryRelationshipPayload_repositoryRelationshipEdgePlan
    }
  },
  DeleteRepositoryRelationshipTypePayload: {
    assertStep: ObjectStep,
    plans: {
      clientMutationId: getClientMutationIdForCreatePlan,
      deletedRepositoryRelationshipTypeId($object) {
        const $record = $object.getStepForKey("result"),
          specifier = nodeIdHandler_RepositoryRelationshipType.plan($record);
        return lambda(specifier, base64JSONNodeIdCodec.encode);
      },
      query: queryPlan,
      repositoryRelationshipType: planCreatePayloadResult,
      repositoryRelationshipTypeEdge: CreateRepositoryRelationshipTypePayload_repositoryRelationshipTypeEdgePlan
    }
  },
  DeleteUserPayload: {
    assertStep: ObjectStep,
    plans: {
      clientMutationId: getClientMutationIdForCreatePlan,
      deletedUserId($object) {
        const $record = $object.getStepForKey("result"),
          specifier = nodeIdHandler_User.plan($record);
        return lambda(specifier, base64JSONNodeIdCodec.encode);
      },
      query: queryPlan,
      user: planCreatePayloadResult,
      userEdge: CreateUserPayload_userEdgePlan
    }
  },
  ExternalDependency: {
    assertStep: assertPgClassSingleStep,
    plans: {
      createdAt: RepositoryRelationshipMetadatum_createdAtPlan,
      detectionSource: RepositoryRelationship_detectionSourcePlan,
      id($parent) {
        const specifier = nodeIdHandler_ExternalDependency.plan($parent);
        return lambda(specifier, nodeIdCodecs[nodeIdHandler_ExternalDependency.codec.name].encode);
      },
      packageManager($record) {
        return $record.get("package_manager");
      },
      packageName($record) {
        return $record.get("package_name");
      },
      repository: RepositoryCollaborator_repositoryPlan,
      repositoryId: RepositoryCollaborator_repositoryIdPlan,
      rowId: RepositoryRelationshipMetadatum_rowIdPlan,
      versionConstraint: RepositoryRelationship_versionConstraintPlan
    },
    planType($specifier) {
      const spec = Object.create(null);
      for (const pkCol of external_dependencyUniques[0].attributes) spec[pkCol] = get2($specifier, pkCol);
      return spec_resource_external_dependencyPgResource.get(spec);
    }
  },
  ExternalDependencyAggregates: {
    assertStep: assertPgClassSingleStep,
    plans: {
      distinctCount: pgAggregatesPlanAggregates,
      keys: RepositoryCollaboratorAggregates_keysPlan
    }
  },
  ExternalDependencyConnection: {
    assertStep: ConnectionStep,
    plans: {
      aggregates: pgAggregatesCloneSubplanWithoutPaginationSingle,
      groupedAggregates: {
        plan: pgAggregateCloneSubplanWithoutPaginationAsAggregate,
        args: {
          groupBy: pgAggregatesApplyGroupedAggregate,
          having: pgAggregatesApplyConditionsToGroupedAggregates
        }
      },
      totalCount: totalCountConnectionPlan
    }
  },
  ExternalDependencyDistinctCountAggregates: {
    plans: {
      createdAt: RepositoryCollaboratorDistinctCountAggregates_createdAtPlan,
      detectionSource: ExternalDependencyDistinctCountAggregates_detectionSourcePlan,
      packageManager($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.text, "package_manager", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
      },
      packageName($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.text, "package_name", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
      },
      repositoryId: RepositoryCollaboratorDistinctCountAggregates_repositoryIdPlan,
      rowId: PullRequestReviewDistinctCountAggregates_rowIdPlan,
      versionConstraint: ExternalDependencyDistinctCountAggregates_versionConstraintPlan
    }
  },
  GitActor: {
    plans: {
      date($actor) {
        return lambda($actor, actor => {
          const a = actor;
          return a?.timestamp ? new Date(a.timestamp * 1000).toISOString() : null;
        });
      },
      email($actor) {
        return lambda($actor, actor => actor?.email ?? null);
      },
      name($actor) {
        return lambda($actor, actor => actor?.name ?? null);
      }
    }
  },
  InitializeRepositoryPayload: {
    plans: {
      error: InitializeRepositoryPayload_error_plan,
      repository($payload) {
        return lambda($payload, p => p?.repository ?? null);
      },
      success: InitializeRepositoryPayload_success_plan
    }
  },
  MergePullRequestPayload: {
    plans: {
      error: InitializeRepositoryPayload_error_plan,
      mergeCommitSha($payload) {
        return lambda($payload, p => p?.mergeCommitSha ?? null);
      },
      success: InitializeRepositoryPayload_success_plan
    }
  },
  Organization: {
    assertStep: assertPgClassSingleStep,
    plans: {
      avatarUrl: Organization_avatarUrlPlan,
      billingAccountId($record) {
        return $record.get("billing_account_id");
      },
      createdAt: RepositoryRelationshipMetadatum_createdAtPlan,
      deletedAt($record) {
        return $record.get("deleted_at");
      },
      deletionReason($record) {
        return $record.get("deletion_reason");
      },
      id($parent) {
        const specifier = nodeIdHandler_Organization.plan($parent);
        return lambda(specifier, nodeIdCodecs[nodeIdHandler_Organization.codec.name].encode);
      },
      idpOrganizationId($record) {
        return $record.get("idp_organization_id");
      },
      repositories: {
        plan($record) {
          const $records = spec_resource_repositoryPgResource.find({
            organization_id: $record.get("id")
          });
          return connection($records);
        },
        args: {
          first: applyFirstArg,
          last: applyLastArg,
          offset: applyOffsetArg,
          before: applyBeforeArg,
          after: applyAfterArg,
          condition: applyConditionArgToConnection,
          filter: RepositoryRelationship_repositoryRelationshipMetadataByRelationshipIdfilterApplyPlan,
          orderBy: applyOrderByArgToConnection
        }
      },
      repositoryRelationshipTypes: {
        plan($record) {
          const $records = spec_resource_repository_relationship_typePgResource.find({
            organization_id: $record.get("id")
          });
          return connection($records);
        },
        args: {
          first: applyFirstArg,
          last: applyLastArg,
          offset: applyOffsetArg,
          before: applyBeforeArg,
          after: applyAfterArg,
          condition: applyConditionArgToConnection,
          filter: RepositoryRelationship_repositoryRelationshipMetadataByRelationshipIdfilterApplyPlan,
          orderBy: applyOrderByArgToConnection
        }
      },
      rowId: RepositoryRelationshipMetadatum_rowIdPlan,
      subscriptionId($record) {
        return $record.get("subscription_id");
      },
      updatedAt: RepositoryRelationship_updatedAtPlan
    },
    planType($specifier) {
      const spec = Object.create(null);
      for (const pkCol of organizationUniques[0].attributes) spec[pkCol] = get2($specifier, pkCol);
      return spec_resource_organizationPgResource.get(spec);
    }
  },
  OrganizationAggregates: {
    assertStep: assertPgClassSingleStep,
    plans: {
      distinctCount: pgAggregatesPlanAggregates,
      keys: RepositoryCollaboratorAggregates_keysPlan
    }
  },
  OrganizationConnection: {
    assertStep: ConnectionStep,
    plans: {
      aggregates: pgAggregatesCloneSubplanWithoutPaginationSingle,
      groupedAggregates: {
        plan: pgAggregateCloneSubplanWithoutPaginationAsAggregate,
        args: {
          groupBy: pgAggregatesApplyGroupedAggregate,
          having: pgAggregatesApplyConditionsToGroupedAggregates
        }
      },
      totalCount: totalCountConnectionPlan
    }
  },
  OrganizationDistinctCountAggregates: {
    plans: {
      avatarUrl: UserDistinctCountAggregates_avatarUrlPlan,
      billingAccountId($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.text, "billing_account_id", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
      },
      createdAt: RepositoryCollaboratorDistinctCountAggregates_createdAtPlan,
      deletedAt($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.timestamp, "deleted_at", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
      },
      deletionReason($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.text, "deletion_reason", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
      },
      description: PullRequestDistinctCountAggregates_descriptionPlan,
      idpOrganizationId($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.text, "idp_organization_id", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
      },
      rowId: PullRequestReviewDistinctCountAggregates_rowIdPlan,
      subscriptionId($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.text, "subscription_id", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
      },
      updatedAt: RepositoryCollaboratorDistinctCountAggregates_updatedAtPlan
    }
  },
  PullRequest: {
    assertStep: assertPgClassSingleStep,
    plans: {
      author: PullRequestComment_authorPlan,
      authorId: PullRequestComment_authorIdPlan,
      closedAt($record) {
        return $record.get("closed_at");
      },
      createdAt: RepositoryRelationshipMetadatum_createdAtPlan,
      id($parent) {
        const specifier = nodeIdHandler_PullRequest.plan($parent);
        return lambda(specifier, nodeIdCodecs[nodeIdHandler_PullRequest.codec.name].encode);
      },
      mergeCommitSha($record) {
        return $record.get("merge_commit_sha");
      },
      mergedAt($record) {
        return $record.get("merged_at");
      },
      mergedBy($record) {
        return spec_resource_userPgResource.get({
          id: $record.get("merged_by_id")
        });
      },
      mergedById($record) {
        return $record.get("merged_by_id");
      },
      pullRequestComments: {
        plan($record) {
          const $records = spec_resource_pull_request_commentPgResource.find({
            pull_request_id: $record.get("id")
          });
          return connection($records);
        },
        args: {
          first: applyFirstArg,
          last: applyLastArg,
          offset: applyOffsetArg,
          before: applyBeforeArg,
          after: applyAfterArg,
          condition: applyConditionArgToConnection,
          filter: RepositoryRelationship_repositoryRelationshipMetadataByRelationshipIdfilterApplyPlan,
          orderBy: applyOrderByArgToConnection
        }
      },
      pullRequestReviews: {
        plan($record) {
          const $records = spec_resource_pull_request_reviewPgResource.find({
            pull_request_id: $record.get("id")
          });
          return connection($records);
        },
        args: {
          first: applyFirstArg,
          last: applyLastArg,
          offset: applyOffsetArg,
          before: applyBeforeArg,
          after: applyAfterArg,
          condition: applyConditionArgToConnection,
          filter: RepositoryRelationship_repositoryRelationshipMetadataByRelationshipIdfilterApplyPlan,
          orderBy: applyOrderByArgToConnection
        }
      },
      repository: RepositoryCollaborator_repositoryPlan,
      repositoryId: RepositoryCollaborator_repositoryIdPlan,
      rowId: RepositoryRelationshipMetadatum_rowIdPlan,
      sourceBranch($record) {
        return $record.get("source_branch");
      },
      targetBranch($record) {
        return $record.get("target_branch");
      },
      updatedAt: RepositoryRelationship_updatedAtPlan
    },
    planType($specifier) {
      const spec = Object.create(null);
      for (const pkCol of pull_requestUniques[0].attributes) spec[pkCol] = get2($specifier, pkCol);
      return spec_resource_pull_requestPgResource.get(spec);
    }
  },
  PullRequestAggregates: {
    assertStep: assertPgClassSingleStep,
    plans: {
      average: pgAggregatesPlanAggregates,
      distinctCount: pgAggregatesPlanAggregates,
      keys: RepositoryCollaboratorAggregates_keysPlan,
      max: pgAggregatesPlanAggregates,
      min: pgAggregatesPlanAggregates,
      stddevPopulation: pgAggregatesPlanAggregates,
      stddevSample: pgAggregatesPlanAggregates,
      sum: pgAggregatesPlanAggregates,
      variancePopulation: pgAggregatesPlanAggregates,
      varianceSample: pgAggregatesPlanAggregates
    }
  },
  PullRequestAverageAggregates: {
    plans: {
      number($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.int, "number", TYPES.numeric, pgAggregateSpec_average, $pgSelectSingle);
      }
    }
  },
  PullRequestComment: {
    assertStep: assertPgClassSingleStep,
    plans: {
      author: PullRequestComment_authorPlan,
      authorId: PullRequestComment_authorIdPlan,
      commitSha($record) {
        return $record.get("commit_sha");
      },
      createdAt: RepositoryRelationshipMetadatum_createdAtPlan,
      id($parent) {
        const specifier = nodeIdHandler_PullRequestComment.plan($parent);
        return lambda(specifier, nodeIdCodecs[nodeIdHandler_PullRequestComment.codec.name].encode);
      },
      pullRequest: PullRequestComment_pullRequestPlan,
      pullRequestId: PullRequestComment_pullRequestIdPlan,
      replyToId($record) {
        return $record.get("reply_to_id");
      },
      rowId: RepositoryRelationshipMetadatum_rowIdPlan,
      updatedAt: RepositoryRelationship_updatedAtPlan
    },
    planType($specifier) {
      const spec = Object.create(null);
      for (const pkCol of pull_request_commentUniques[0].attributes) spec[pkCol] = get2($specifier, pkCol);
      return spec_resource_pull_request_commentPgResource.get(spec);
    }
  },
  PullRequestCommentAggregates: {
    assertStep: assertPgClassSingleStep,
    plans: {
      average: pgAggregatesPlanAggregates,
      distinctCount: pgAggregatesPlanAggregates,
      keys: RepositoryCollaboratorAggregates_keysPlan,
      max: pgAggregatesPlanAggregates,
      min: pgAggregatesPlanAggregates,
      stddevPopulation: pgAggregatesPlanAggregates,
      stddevSample: pgAggregatesPlanAggregates,
      sum: pgAggregatesPlanAggregates,
      variancePopulation: pgAggregatesPlanAggregates,
      varianceSample: pgAggregatesPlanAggregates
    }
  },
  PullRequestCommentAverageAggregates: {
    plans: {
      line($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.int, "line", TYPES.numeric, pgAggregateSpec_average, $pgSelectSingle);
      }
    }
  },
  PullRequestCommentConnection: {
    assertStep: ConnectionStep,
    plans: {
      aggregates: pgAggregatesCloneSubplanWithoutPaginationSingle,
      groupedAggregates: {
        plan: pgAggregateCloneSubplanWithoutPaginationAsAggregate,
        args: {
          groupBy: pgAggregatesApplyGroupedAggregate,
          having: pgAggregatesApplyConditionsToGroupedAggregates
        }
      },
      totalCount: totalCountConnectionPlan
    }
  },
  PullRequestCommentDistinctCountAggregates: {
    plans: {
      authorId: PullRequestCommentDistinctCountAggregates_authorIdPlan,
      body: PullRequestReviewDistinctCountAggregates_bodyPlan,
      commitSha($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.text, "commit_sha", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
      },
      createdAt: RepositoryCollaboratorDistinctCountAggregates_createdAtPlan,
      line($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.int, "line", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
      },
      path($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.text, "path", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
      },
      pullRequestId: PullRequestReviewDistinctCountAggregates_pullRequestIdPlan,
      replyToId($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.uuid, "reply_to_id", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
      },
      rowId: PullRequestReviewDistinctCountAggregates_rowIdPlan,
      side($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.text, "side", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
      },
      updatedAt: RepositoryCollaboratorDistinctCountAggregates_updatedAtPlan
    }
  },
  PullRequestCommentMaxAggregates: {
    plans: {
      line($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.int, "line", TYPES.int, pgAggregateSpec_max, $pgSelectSingle);
      }
    }
  },
  PullRequestCommentMinAggregates: {
    plans: {
      line($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.int, "line", TYPES.int, pgAggregateSpec_min, $pgSelectSingle);
      }
    }
  },
  PullRequestCommentStddevPopulationAggregates: {
    plans: {
      line($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.int, "line", TYPES.numeric, pgAggregateSpec_stddevPopulation, $pgSelectSingle);
      }
    }
  },
  PullRequestCommentStddevSampleAggregates: {
    plans: {
      line($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.int, "line", TYPES.numeric, pgAggregateSpec_stddevSample, $pgSelectSingle);
      }
    }
  },
  PullRequestCommentSumAggregates: {
    plans: {
      line($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.int, "line", TYPES.bigint, pgAggregateSpec_sum, $pgSelectSingle);
      }
    }
  },
  PullRequestCommentVariancePopulationAggregates: {
    plans: {
      line($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.int, "line", TYPES.numeric, pgAggregateSpec_variancePopulation, $pgSelectSingle);
      }
    }
  },
  PullRequestCommentVarianceSampleAggregates: {
    plans: {
      line($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.int, "line", TYPES.numeric, pgAggregateSpec_varianceSample, $pgSelectSingle);
      }
    }
  },
  PullRequestConnection: {
    assertStep: ConnectionStep,
    plans: {
      aggregates: pgAggregatesCloneSubplanWithoutPaginationSingle,
      groupedAggregates: {
        plan: pgAggregateCloneSubplanWithoutPaginationAsAggregate,
        args: {
          groupBy: pgAggregatesApplyGroupedAggregate,
          having: pgAggregatesApplyConditionsToGroupedAggregates
        }
      },
      totalCount: totalCountConnectionPlan
    }
  },
  PullRequestDistinctCountAggregates: {
    plans: {
      authorId: PullRequestCommentDistinctCountAggregates_authorIdPlan,
      closedAt($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.timestamp, "closed_at", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
      },
      createdAt: RepositoryCollaboratorDistinctCountAggregates_createdAtPlan,
      description: PullRequestDistinctCountAggregates_descriptionPlan,
      mergeCommitSha($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.text, "merge_commit_sha", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
      },
      mergedAt($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.timestamp, "merged_at", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
      },
      mergedById($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.uuid, "merged_by_id", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
      },
      number($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.int, "number", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
      },
      repositoryId: RepositoryCollaboratorDistinctCountAggregates_repositoryIdPlan,
      rowId: PullRequestReviewDistinctCountAggregates_rowIdPlan,
      sourceBranch($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.text, "source_branch", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
      },
      state: PullRequestReviewDistinctCountAggregates_statePlan,
      targetBranch($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.text, "target_branch", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
      },
      title($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.text, "title", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
      },
      updatedAt: RepositoryCollaboratorDistinctCountAggregates_updatedAtPlan
    }
  },
  PullRequestMaxAggregates: {
    plans: {
      number($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.int, "number", TYPES.int, pgAggregateSpec_max, $pgSelectSingle);
      }
    }
  },
  PullRequestMinAggregates: {
    plans: {
      number($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.int, "number", TYPES.int, pgAggregateSpec_min, $pgSelectSingle);
      }
    }
  },
  PullRequestReview: {
    assertStep: assertPgClassSingleStep,
    plans: {
      createdAt: RepositoryRelationshipMetadatum_createdAtPlan,
      id($parent) {
        const specifier = nodeIdHandler_PullRequestReview.plan($parent);
        return lambda(specifier, nodeIdCodecs[nodeIdHandler_PullRequestReview.codec.name].encode);
      },
      pullRequest: PullRequestComment_pullRequestPlan,
      pullRequestId: PullRequestComment_pullRequestIdPlan,
      reviewer($record) {
        return spec_resource_userPgResource.get({
          id: $record.get("reviewer_id")
        });
      },
      reviewerId($record) {
        return $record.get("reviewer_id");
      },
      rowId: RepositoryRelationshipMetadatum_rowIdPlan,
      submittedAt($record) {
        return $record.get("submitted_at");
      },
      updatedAt: RepositoryRelationship_updatedAtPlan
    },
    planType($specifier) {
      const spec = Object.create(null);
      for (const pkCol of pull_request_reviewUniques[0].attributes) spec[pkCol] = get2($specifier, pkCol);
      return spec_resource_pull_request_reviewPgResource.get(spec);
    }
  },
  PullRequestReviewAggregates: {
    assertStep: assertPgClassSingleStep,
    plans: {
      distinctCount: pgAggregatesPlanAggregates,
      keys: RepositoryCollaboratorAggregates_keysPlan
    }
  },
  PullRequestReviewConnection: {
    assertStep: ConnectionStep,
    plans: {
      aggregates: pgAggregatesCloneSubplanWithoutPaginationSingle,
      groupedAggregates: {
        plan: pgAggregateCloneSubplanWithoutPaginationAsAggregate,
        args: {
          groupBy: pgAggregatesApplyGroupedAggregate,
          having: pgAggregatesApplyConditionsToGroupedAggregates
        }
      },
      totalCount: totalCountConnectionPlan
    }
  },
  PullRequestReviewDistinctCountAggregates: {
    plans: {
      body: PullRequestReviewDistinctCountAggregates_bodyPlan,
      createdAt: RepositoryCollaboratorDistinctCountAggregates_createdAtPlan,
      pullRequestId: PullRequestReviewDistinctCountAggregates_pullRequestIdPlan,
      reviewerId($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.uuid, "reviewer_id", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
      },
      rowId: PullRequestReviewDistinctCountAggregates_rowIdPlan,
      state: PullRequestReviewDistinctCountAggregates_statePlan,
      submittedAt($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.timestamp, "submitted_at", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
      },
      updatedAt: RepositoryCollaboratorDistinctCountAggregates_updatedAtPlan
    }
  },
  PullRequestStddevPopulationAggregates: {
    plans: {
      number($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.int, "number", TYPES.numeric, pgAggregateSpec_stddevPopulation, $pgSelectSingle);
      }
    }
  },
  PullRequestStddevSampleAggregates: {
    plans: {
      number($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.int, "number", TYPES.numeric, pgAggregateSpec_stddevSample, $pgSelectSingle);
      }
    }
  },
  PullRequestSumAggregates: {
    plans: {
      number($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.int, "number", TYPES.bigint, pgAggregateSpec_sum, $pgSelectSingle);
      }
    }
  },
  PullRequestVariancePopulationAggregates: {
    plans: {
      number($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.int, "number", TYPES.numeric, pgAggregateSpec_variancePopulation, $pgSelectSingle);
      }
    }
  },
  PullRequestVarianceSampleAggregates: {
    plans: {
      number($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.int, "number", TYPES.numeric, pgAggregateSpec_varianceSample, $pgSelectSingle);
      }
    }
  },
  Ref: {
    plans: {
      id($ref) {
        return lambda($ref, ref => {
          const r = ref;
          return r ? `${r.prefix}${r.name}` : null;
        });
      },
      name($ref) {
        return lambda($ref, ref => ref?.name ?? null);
      },
      prefix($ref) {
        return lambda($ref, ref => ref?.prefix ?? null);
      },
      target($ref) {
        return lambda($ref, async ref => {
          const r = ref;
          if (!r) return null;
          const {
            owner,
            repo,
            sha
          } = r;
          if (!(await repositoryService.exists(owner, repo))) return null;
          const commit = await gitService.getCommit(owner, repo, sha);
          if (!commit) return null;
          return {
            __typename: "Commit",
            owner,
            repo,
            oid: commit.sha,
            message: commit.message,
            author: commit.author,
            committer: commit.committer,
            parents: commit.parents
          };
        });
      }
    }
  },
  RefConnection: {
    plans: {
      nodes($conn) {
        return lambda($conn, conn => conn?.nodes ?? []);
      },
      totalCount($conn) {
        return lambda($conn, conn => conn?.totalCount ?? 0);
      }
    }
  },
  Repository: {
    assertStep: assertPgClassSingleStep,
    plans: {
      commit($repository, fieldArgs) {
        const $sha = fieldArgs.getRaw("sha"),
          $db = context().get("db");
        return lambda(object({
          repository: $repository,
          sha: $sha,
          db: $db
        }), async args => {
          const {
            repository,
            sha,
            db
          } = args;
          if (!repository || !sha) return null;
          const owner = await getOwnerSlug(repository, db);
          if (!owner) return null;
          const repo = repository.slug;
          if (!(await repositoryService.exists(owner, repo))) return null;
          const commit = await gitService.getCommit(owner, repo, sha);
          if (!commit) return null;
          return {
            __typename: "Commit",
            owner,
            repo,
            oid: commit.sha,
            message: commit.message,
            author: commit.author,
            committer: commit.committer,
            parents: commit.parents
          };
        });
      },
      createdAt: RepositoryRelationshipMetadatum_createdAtPlan,
      defaultBranch($record) {
        return $record.get("default_branch");
      },
      defaultBranchRef($repository) {
        const $db = context().get("db");
        return lambda(object({
          repository: $repository,
          db: $db
        }), async args => {
          const {
              repository,
              db
            } = args,
            r = repository;
          if (!r) return null;
          const owner = await getOwnerSlug(r, db);
          if (!owner) return null;
          const repo = r.slug,
            defaultBranch = r.defaultBranch || "master";
          if (!(await repositoryService.exists(owner, repo))) return null;
          const sha = await gitService.resolveRef(owner, repo, `refs/heads/${defaultBranch}`);
          if (!sha) return null;
          return {
            prefix: "refs/heads/",
            name: defaultBranch,
            sha,
            owner,
            repo
          };
        });
      },
      externalDependencies: {
        plan($record) {
          const $records = spec_resource_external_dependencyPgResource.find({
            repository_id: $record.get("id")
          });
          return connection($records);
        },
        args: {
          first: applyFirstArg,
          last: applyLastArg,
          offset: applyOffsetArg,
          before: applyBeforeArg,
          after: applyAfterArg,
          condition: applyConditionArgToConnection,
          filter: RepositoryRelationship_repositoryRelationshipMetadataByRelationshipIdfilterApplyPlan,
          orderBy: applyOrderByArgToConnection
        }
      },
      id($parent) {
        const specifier = nodeIdHandler_Repository.plan($parent);
        return lambda(specifier, nodeIdCodecs[nodeIdHandler_Repository.codec.name].encode);
      },
      organization: RepositoryRelationshipType_organizationPlan,
      organizationId: RepositoryRelationshipType_organizationIdPlan,
      owner($record) {
        return spec_resource_userPgResource.get({
          id: $record.get("owner_id")
        });
      },
      ownerId($record) {
        return $record.get("owner_id");
      },
      pullRequests: {
        plan($record) {
          const $records = spec_resource_pull_requestPgResource.find({
            repository_id: $record.get("id")
          });
          return connection($records);
        },
        args: {
          first: applyFirstArg,
          last: applyLastArg,
          offset: applyOffsetArg,
          before: applyBeforeArg,
          after: applyAfterArg,
          condition: applyConditionArgToConnection,
          filter: RepositoryRelationship_repositoryRelationshipMetadataByRelationshipIdfilterApplyPlan,
          orderBy: applyOrderByArgToConnection
        }
      },
      ref($repository, fieldArgs) {
        const $qualifiedName = fieldArgs.getRaw("qualifiedName"),
          $db = context().get("db");
        return lambda(object({
          repository: $repository,
          qualifiedName: $qualifiedName,
          db: $db
        }), async args => {
          const {
            repository,
            qualifiedName,
            db
          } = args;
          if (!repository || !qualifiedName) return null;
          const owner = await getOwnerSlug(repository, db);
          if (!owner) return null;
          const repo = repository.slug;
          if (!(await repositoryService.exists(owner, repo))) return null;
          let prefix, name;
          if (qualifiedName.startsWith("refs/heads/")) {
            prefix = "refs/heads/";
            name = qualifiedName.slice(11);
          } else if (qualifiedName.startsWith("refs/tags/")) {
            prefix = "refs/tags/";
            name = qualifiedName.slice(10);
          } else return null;
          const sha = await gitService.resolveRef(owner, repo, qualifiedName);
          if (!sha) return null;
          return {
            prefix,
            name,
            sha,
            owner,
            repo
          };
        });
      },
      refs($repository, fieldArgs) {
        const $refPrefix = fieldArgs.getRaw("refPrefix"),
          $first = fieldArgs.getRaw("first"),
          $db = context().get("db");
        return lambda(object({
          repository: $repository,
          refPrefix: $refPrefix,
          first: $first,
          db: $db
        }), async args => {
          const {
            repository,
            refPrefix,
            first,
            db
          } = args;
          if (!repository) return {
            nodes: [],
            totalCount: 0
          };
          const owner = await getOwnerSlug(repository, db);
          if (!owner) return {
            nodes: [],
            totalCount: 0
          };
          const repo = repository.slug;
          if (!(await repositoryService.exists(owner, repo))) return {
            nodes: [],
            totalCount: 0
          };
          let refs = [];
          if (refPrefix === "refs/heads/") refs = (await gitService.listBranches(owner, repo)).map(b => ({
            prefix: "refs/heads/",
            name: b.name,
            sha: b.sha,
            owner,
            repo
          }));else if (refPrefix === "refs/tags/") refs = (await gitService.listTags(owner, repo)).map(t => ({
            prefix: "refs/tags/",
            name: t.name,
            sha: t.sha,
            owner,
            repo
          }));
          return {
            nodes: refs.slice(0, first ?? 100),
            totalCount: refs.length
          };
        });
      },
      repositoryCollaborators: {
        plan($record) {
          const $records = spec_resource_repository_collaboratorPgResource.find({
            repository_id: $record.get("id")
          });
          return connection($records);
        },
        args: {
          first: applyFirstArg,
          last: applyLastArg,
          offset: applyOffsetArg,
          before: applyBeforeArg,
          after: applyAfterArg,
          condition: applyConditionArgToConnection,
          filter: RepositoryRelationship_repositoryRelationshipMetadataByRelationshipIdfilterApplyPlan,
          orderBy: applyOrderByArgToConnection
        }
      },
      repositoryRelationshipsBySourceRepositoryId: {
        plan($record) {
          const $records = spec_resource_repository_relationshipPgResource.find({
            source_repository_id: $record.get("id")
          });
          return connection($records);
        },
        args: {
          first: applyFirstArg,
          last: applyLastArg,
          offset: applyOffsetArg,
          before: applyBeforeArg,
          after: applyAfterArg,
          condition: applyConditionArgToConnection,
          filter: RepositoryRelationship_repositoryRelationshipMetadataByRelationshipIdfilterApplyPlan,
          orderBy: applyOrderByArgToConnection
        }
      },
      repositoryRelationshipsByTargetRepositoryId: {
        plan($record) {
          const $records = spec_resource_repository_relationshipPgResource.find({
            target_repository_id: $record.get("id")
          });
          return connection($records);
        },
        args: {
          first: applyFirstArg,
          last: applyLastArg,
          offset: applyOffsetArg,
          before: applyBeforeArg,
          after: applyAfterArg,
          condition: applyConditionArgToConnection,
          filter: RepositoryRelationship_repositoryRelationshipMetadataByRelationshipIdfilterApplyPlan,
          orderBy: applyOrderByArgToConnection
        }
      },
      rowId: RepositoryRelationshipMetadatum_rowIdPlan,
      updatedAt: RepositoryRelationship_updatedAtPlan
    },
    planType($specifier) {
      const spec = Object.create(null);
      for (const pkCol of repositoryUniques[0].attributes) spec[pkCol] = get2($specifier, pkCol);
      return spec_resource_repositoryPgResource.get(spec);
    }
  },
  RepositoryAggregates: {
    assertStep: assertPgClassSingleStep,
    plans: {
      distinctCount: pgAggregatesPlanAggregates,
      keys: RepositoryCollaboratorAggregates_keysPlan
    }
  },
  RepositoryCollaborator: {
    assertStep: assertPgClassSingleStep,
    plans: {
      createdAt: RepositoryRelationshipMetadatum_createdAtPlan,
      id($parent) {
        const specifier = nodeIdHandler_RepositoryCollaborator.plan($parent);
        return lambda(specifier, nodeIdCodecs[nodeIdHandler_RepositoryCollaborator.codec.name].encode);
      },
      repository: RepositoryCollaborator_repositoryPlan,
      repositoryId: RepositoryCollaborator_repositoryIdPlan,
      updatedAt: RepositoryRelationship_updatedAtPlan,
      user($record) {
        return spec_resource_userPgResource.get({
          id: $record.get("user_id")
        });
      },
      userId($record) {
        return $record.get("user_id");
      }
    },
    planType($specifier) {
      const spec = Object.create(null);
      for (const pkCol of repository_collaboratorUniques[0].attributes) spec[pkCol] = get2($specifier, pkCol);
      return spec_resource_repository_collaboratorPgResource.get(spec);
    }
  },
  RepositoryCollaboratorAggregates: {
    assertStep: assertPgClassSingleStep,
    plans: {
      distinctCount: pgAggregatesPlanAggregates,
      keys: RepositoryCollaboratorAggregates_keysPlan
    }
  },
  RepositoryCollaboratorConnection: {
    assertStep: ConnectionStep,
    plans: {
      aggregates: pgAggregatesCloneSubplanWithoutPaginationSingle,
      groupedAggregates: {
        plan: pgAggregateCloneSubplanWithoutPaginationAsAggregate,
        args: {
          groupBy: pgAggregatesApplyGroupedAggregate,
          having: pgAggregatesApplyConditionsToGroupedAggregates
        }
      },
      totalCount: totalCountConnectionPlan
    }
  },
  RepositoryCollaboratorDistinctCountAggregates: {
    plans: {
      createdAt: RepositoryCollaboratorDistinctCountAggregates_createdAtPlan,
      permission($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(permissionCodec, "permission", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
      },
      repositoryId: RepositoryCollaboratorDistinctCountAggregates_repositoryIdPlan,
      updatedAt: RepositoryCollaboratorDistinctCountAggregates_updatedAtPlan,
      userId($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.uuid, "user_id", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
      }
    }
  },
  RepositoryConnection: {
    assertStep: ConnectionStep,
    plans: {
      aggregates: pgAggregatesCloneSubplanWithoutPaginationSingle,
      groupedAggregates: {
        plan: pgAggregateCloneSubplanWithoutPaginationAsAggregate,
        args: {
          groupBy: pgAggregatesApplyGroupedAggregate,
          having: pgAggregatesApplyConditionsToGroupedAggregates
        }
      },
      totalCount: totalCountConnectionPlan
    }
  },
  RepositoryDistinctCountAggregates: {
    plans: {
      createdAt: RepositoryCollaboratorDistinctCountAggregates_createdAtPlan,
      defaultBranch($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.text, "default_branch", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
      },
      description: PullRequestDistinctCountAggregates_descriptionPlan,
      name: RepositoryDistinctCountAggregates_namePlan,
      organizationId: RepositoryDistinctCountAggregates_organizationIdPlan,
      ownerId($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.uuid, "owner_id", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
      },
      rowId: PullRequestReviewDistinctCountAggregates_rowIdPlan,
      slug($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.text, "slug", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
      },
      updatedAt: RepositoryCollaboratorDistinctCountAggregates_updatedAtPlan,
      visibility($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(visibilityCodec, "visibility", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
      }
    }
  },
  RepositoryRelationship: {
    assertStep: assertPgClassSingleStep,
    plans: {
      createdAt: RepositoryRelationshipMetadatum_createdAtPlan,
      detectionSource: RepositoryRelationship_detectionSourcePlan,
      id($parent) {
        const specifier = nodeIdHandler_RepositoryRelationship.plan($parent);
        return lambda(specifier, nodeIdCodecs[nodeIdHandler_RepositoryRelationship.codec.name].encode);
      },
      relationshipType($record) {
        return spec_resource_repository_relationship_typePgResource.get({
          id: $record.get("relationship_type_id")
        });
      },
      relationshipTypeId($record) {
        return $record.get("relationship_type_id");
      },
      repositoryRelationshipMetadataByRelationshipId: {
        plan($record) {
          const $records = spec_resource_repository_relationship_metadataPgResource.find({
            relationship_id: $record.get("id")
          });
          return connection($records);
        },
        args: {
          first: applyFirstArg,
          last: applyLastArg,
          offset: applyOffsetArg,
          before: applyBeforeArg,
          after: applyAfterArg,
          condition: applyConditionArgToConnection,
          filter: RepositoryRelationship_repositoryRelationshipMetadataByRelationshipIdfilterApplyPlan,
          orderBy: applyOrderByArgToConnection
        }
      },
      rowId: RepositoryRelationshipMetadatum_rowIdPlan,
      sourceRepository($record) {
        return spec_resource_repositoryPgResource.get({
          id: $record.get("source_repository_id")
        });
      },
      sourceRepositoryId($record) {
        return $record.get("source_repository_id");
      },
      targetRepository($record) {
        return spec_resource_repositoryPgResource.get({
          id: $record.get("target_repository_id")
        });
      },
      targetRepositoryId($record) {
        return $record.get("target_repository_id");
      },
      updatedAt: RepositoryRelationship_updatedAtPlan,
      versionConstraint: RepositoryRelationship_versionConstraintPlan
    },
    planType($specifier) {
      const spec = Object.create(null);
      for (const pkCol of repository_relationshipUniques[0].attributes) spec[pkCol] = get2($specifier, pkCol);
      return spec_resource_repository_relationshipPgResource.get(spec);
    }
  },
  RepositoryRelationshipAggregates: {
    assertStep: assertPgClassSingleStep,
    plans: {
      average: pgAggregatesPlanAggregates,
      distinctCount: pgAggregatesPlanAggregates,
      keys: RepositoryCollaboratorAggregates_keysPlan,
      max: pgAggregatesPlanAggregates,
      min: pgAggregatesPlanAggregates,
      stddevPopulation: pgAggregatesPlanAggregates,
      stddevSample: pgAggregatesPlanAggregates,
      sum: pgAggregatesPlanAggregates,
      variancePopulation: pgAggregatesPlanAggregates,
      varianceSample: pgAggregatesPlanAggregates
    }
  },
  RepositoryRelationshipAverageAggregates: {
    plans: {
      confidence($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.float4, "confidence", TYPES.float, pgAggregateSpec_average, $pgSelectSingle);
      }
    }
  },
  RepositoryRelationshipConnection: {
    assertStep: ConnectionStep,
    plans: {
      aggregates: pgAggregatesCloneSubplanWithoutPaginationSingle,
      groupedAggregates: {
        plan: pgAggregateCloneSubplanWithoutPaginationAsAggregate,
        args: {
          groupBy: pgAggregatesApplyGroupedAggregate,
          having: pgAggregatesApplyConditionsToGroupedAggregates
        }
      },
      totalCount: totalCountConnectionPlan
    }
  },
  RepositoryRelationshipDistinctCountAggregates: {
    plans: {
      branch($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.text, "branch", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
      },
      confidence($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.float4, "confidence", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
      },
      createdAt: RepositoryCollaboratorDistinctCountAggregates_createdAtPlan,
      detectionSource: ExternalDependencyDistinctCountAggregates_detectionSourcePlan,
      relationshipTypeId($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.uuid, "relationship_type_id", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
      },
      rowId: PullRequestReviewDistinctCountAggregates_rowIdPlan,
      sourceRepositoryId($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.uuid, "source_repository_id", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
      },
      targetRepositoryId($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.uuid, "target_repository_id", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
      },
      updatedAt: RepositoryCollaboratorDistinctCountAggregates_updatedAtPlan,
      versionConstraint: ExternalDependencyDistinctCountAggregates_versionConstraintPlan
    }
  },
  RepositoryRelationshipMaxAggregates: {
    plans: {
      confidence($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.float4, "confidence", TYPES.float4, pgAggregateSpec_max, $pgSelectSingle);
      }
    }
  },
  RepositoryRelationshipMetadatum: {
    assertStep: assertPgClassSingleStep,
    plans: {
      createdAt: RepositoryRelationshipMetadatum_createdAtPlan,
      id($parent) {
        const specifier = nodeIdHandler_RepositoryRelationshipMetadatum.plan($parent);
        return lambda(specifier, nodeIdCodecs[nodeIdHandler_RepositoryRelationshipMetadatum.codec.name].encode);
      },
      relationship($record) {
        return spec_resource_repository_relationshipPgResource.get({
          id: $record.get("relationship_id")
        });
      },
      relationshipId($record) {
        return $record.get("relationship_id");
      },
      rowId: RepositoryRelationshipMetadatum_rowIdPlan
    },
    planType($specifier) {
      const spec = Object.create(null);
      for (const pkCol of repository_relationship_metadataUniques[0].attributes) spec[pkCol] = get2($specifier, pkCol);
      return spec_resource_repository_relationship_metadataPgResource.get(spec);
    }
  },
  RepositoryRelationshipMetadatumAggregates: {
    assertStep: assertPgClassSingleStep,
    plans: {
      distinctCount: pgAggregatesPlanAggregates,
      keys: RepositoryCollaboratorAggregates_keysPlan
    }
  },
  RepositoryRelationshipMetadatumConnection: {
    assertStep: ConnectionStep,
    plans: {
      aggregates: pgAggregatesCloneSubplanWithoutPaginationSingle,
      groupedAggregates: {
        plan: pgAggregateCloneSubplanWithoutPaginationAsAggregate,
        args: {
          groupBy: pgAggregatesApplyGroupedAggregate,
          having: pgAggregatesApplyConditionsToGroupedAggregates
        }
      },
      totalCount: totalCountConnectionPlan
    }
  },
  RepositoryRelationshipMetadatumDistinctCountAggregates: {
    plans: {
      createdAt: RepositoryCollaboratorDistinctCountAggregates_createdAtPlan,
      key($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.text, "key", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
      },
      relationshipId($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.uuid, "relationship_id", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
      },
      rowId: PullRequestReviewDistinctCountAggregates_rowIdPlan,
      value($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.text, "value", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
      }
    }
  },
  RepositoryRelationshipMinAggregates: {
    plans: {
      confidence($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.float4, "confidence", TYPES.float4, pgAggregateSpec_min, $pgSelectSingle);
      }
    }
  },
  RepositoryRelationshipStddevPopulationAggregates: {
    plans: {
      confidence($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.float4, "confidence", TYPES.float, pgAggregateSpec_stddevPopulation, $pgSelectSingle);
      }
    }
  },
  RepositoryRelationshipStddevSampleAggregates: {
    plans: {
      confidence($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.float4, "confidence", TYPES.float, pgAggregateSpec_stddevSample, $pgSelectSingle);
      }
    }
  },
  RepositoryRelationshipSumAggregates: {
    plans: {
      confidence($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.float4, "confidence", TYPES.float4, pgAggregateSpec_sum, $pgSelectSingle);
      }
    }
  },
  RepositoryRelationshipType: {
    assertStep: assertPgClassSingleStep,
    plans: {
      createdAt: RepositoryRelationshipMetadatum_createdAtPlan,
      id($parent) {
        const specifier = nodeIdHandler_RepositoryRelationshipType.plan($parent);
        return lambda(specifier, nodeIdCodecs[nodeIdHandler_RepositoryRelationshipType.codec.name].encode);
      },
      isDirected($record) {
        return $record.get("is_directed");
      },
      organization: RepositoryRelationshipType_organizationPlan,
      organizationId: RepositoryRelationshipType_organizationIdPlan,
      repositoryRelationshipsByRelationshipTypeId: {
        plan($record) {
          const $records = spec_resource_repository_relationshipPgResource.find({
            relationship_type_id: $record.get("id")
          });
          return connection($records);
        },
        args: {
          first: applyFirstArg,
          last: applyLastArg,
          offset: applyOffsetArg,
          before: applyBeforeArg,
          after: applyAfterArg,
          condition: applyConditionArgToConnection,
          filter: RepositoryRelationship_repositoryRelationshipMetadataByRelationshipIdfilterApplyPlan,
          orderBy: applyOrderByArgToConnection
        }
      },
      rowId: RepositoryRelationshipMetadatum_rowIdPlan
    },
    planType($specifier) {
      const spec = Object.create(null);
      for (const pkCol of repository_relationship_typeUniques[0].attributes) spec[pkCol] = get2($specifier, pkCol);
      return spec_resource_repository_relationship_typePgResource.get(spec);
    }
  },
  RepositoryRelationshipTypeAggregates: {
    assertStep: assertPgClassSingleStep,
    plans: {
      distinctCount: pgAggregatesPlanAggregates,
      keys: RepositoryCollaboratorAggregates_keysPlan
    }
  },
  RepositoryRelationshipTypeConnection: {
    assertStep: ConnectionStep,
    plans: {
      aggregates: pgAggregatesCloneSubplanWithoutPaginationSingle,
      groupedAggregates: {
        plan: pgAggregateCloneSubplanWithoutPaginationAsAggregate,
        args: {
          groupBy: pgAggregatesApplyGroupedAggregate,
          having: pgAggregatesApplyConditionsToGroupedAggregates
        }
      },
      totalCount: totalCountConnectionPlan
    }
  },
  RepositoryRelationshipTypeDistinctCountAggregates: {
    plans: {
      createdAt: RepositoryCollaboratorDistinctCountAggregates_createdAtPlan,
      description: PullRequestDistinctCountAggregates_descriptionPlan,
      isDirected($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.boolean, "is_directed", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
      },
      name: RepositoryDistinctCountAggregates_namePlan,
      organizationId: RepositoryDistinctCountAggregates_organizationIdPlan,
      rowId: PullRequestReviewDistinctCountAggregates_rowIdPlan
    }
  },
  RepositoryRelationshipVariancePopulationAggregates: {
    plans: {
      confidence($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.float4, "confidence", TYPES.float, pgAggregateSpec_variancePopulation, $pgSelectSingle);
      }
    }
  },
  RepositoryRelationshipVarianceSampleAggregates: {
    plans: {
      confidence($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.float4, "confidence", TYPES.float, pgAggregateSpec_varianceSample, $pgSelectSingle);
      }
    }
  },
  Tree: {
    plans: {
      entries($tree) {
        return lambda($tree, tree => tree?.entries ?? []);
      },
      oid($tree) {
        return lambda($tree, tree => tree?.oid ?? null);
      },
      repository($tree) {
        return lambda($tree, tree => {
          const t = tree;
          return t ? {
            owner: t.owner,
            repo: t.repo
          } : null;
        });
      }
    }
  },
  TreeEntry: {
    plans: {
      mode($entry) {
        return lambda($entry, entry => entry?.mode ?? null);
      },
      name($entry) {
        return lambda($entry, entry => entry?.name ?? null);
      },
      object($entry) {
        return lambda($entry, async entry => {
          const e = entry;
          if (!e) return null;
          const {
            type,
            oid,
            owner,
            repo,
            commitOid,
            path
          } = e;
          if (type === "tree") {
            const entries = await gitService.getTree(owner, repo, commitOid, path);
            return {
              __typename: "Tree",
              owner,
              repo,
              oid,
              entries: entries.map(en => ({
                ...en,
                name: en.path,
                path: `${path}/${en.path}`,
                owner,
                repo,
                commitOid
              }))
            };
          }
          if (type === "blob") {
            const content = await gitService.getFileContent(owner, repo, commitOid, path),
              raw = await gitService.getFileRaw(owner, repo, commitOid, path),
              isBinary = content === null && raw !== null,
              byteSize = raw?.length ?? 0;
            return {
              __typename: "Blob",
              owner,
              repo,
              oid,
              text: isBinary ? null : content,
              byteSize,
              isBinary
            };
          }
          return null;
        });
      },
      oid($entry) {
        return lambda($entry, entry => entry?.oid ?? null);
      },
      path($entry) {
        return lambda($entry, entry => entry?.path ?? null);
      },
      type($entry) {
        return lambda($entry, entry => entry?.type ?? null);
      }
    }
  },
  UpdateExternalDependencyPayload: {
    assertStep: ObjectStep,
    plans: {
      clientMutationId: getClientMutationIdForCreatePlan,
      externalDependency: planCreatePayloadResult,
      externalDependencyEdge: CreateExternalDependencyPayload_externalDependencyEdgePlan,
      query: queryPlan
    }
  },
  UpdateOrganizationPayload: {
    assertStep: ObjectStep,
    plans: {
      clientMutationId: getClientMutationIdForCreatePlan,
      organization: planCreatePayloadResult,
      organizationEdge: CreateOrganizationPayload_organizationEdgePlan,
      query: queryPlan
    }
  },
  UpdatePullRequestCommentPayload: {
    assertStep: ObjectStep,
    plans: {
      clientMutationId: getClientMutationIdForCreatePlan,
      pullRequestComment: planCreatePayloadResult,
      pullRequestCommentEdge: CreatePullRequestCommentPayload_pullRequestCommentEdgePlan,
      query: queryPlan
    }
  },
  UpdatePullRequestPayload: {
    assertStep: ObjectStep,
    plans: {
      clientMutationId: getClientMutationIdForCreatePlan,
      pullRequest: planCreatePayloadResult,
      pullRequestEdge: CreatePullRequestPayload_pullRequestEdgePlan,
      query: queryPlan
    }
  },
  UpdatePullRequestReviewPayload: {
    assertStep: ObjectStep,
    plans: {
      clientMutationId: getClientMutationIdForCreatePlan,
      pullRequestReview: planCreatePayloadResult,
      pullRequestReviewEdge: CreatePullRequestReviewPayload_pullRequestReviewEdgePlan,
      query: queryPlan
    }
  },
  UpdateRepositoryCollaboratorPayload: {
    assertStep: ObjectStep,
    plans: {
      clientMutationId: getClientMutationIdForCreatePlan,
      query: queryPlan,
      repositoryCollaborator: planCreatePayloadResult,
      repositoryCollaboratorEdge: CreateRepositoryCollaboratorPayload_repositoryCollaboratorEdgePlan
    }
  },
  UpdateRepositoryPayload: {
    assertStep: ObjectStep,
    plans: {
      clientMutationId: getClientMutationIdForCreatePlan,
      query: queryPlan,
      repository: planCreatePayloadResult,
      repositoryEdge: CreateRepositoryPayload_repositoryEdgePlan
    }
  },
  UpdateRepositoryRelationshipMetadatumPayload: {
    assertStep: ObjectStep,
    plans: {
      clientMutationId: getClientMutationIdForCreatePlan,
      query: queryPlan,
      repositoryRelationshipMetadatum: planCreatePayloadResult,
      repositoryRelationshipMetadatumEdge: CreateRepositoryRelationshipMetadatumPayload_repositoryRelationshipMetadatumEdgePlan
    }
  },
  UpdateRepositoryRelationshipPayload: {
    assertStep: ObjectStep,
    plans: {
      clientMutationId: getClientMutationIdForCreatePlan,
      query: queryPlan,
      repositoryRelationship: planCreatePayloadResult,
      repositoryRelationshipEdge: CreateRepositoryRelationshipPayload_repositoryRelationshipEdgePlan
    }
  },
  UpdateRepositoryRelationshipTypePayload: {
    assertStep: ObjectStep,
    plans: {
      clientMutationId: getClientMutationIdForCreatePlan,
      query: queryPlan,
      repositoryRelationshipType: planCreatePayloadResult,
      repositoryRelationshipTypeEdge: CreateRepositoryRelationshipTypePayload_repositoryRelationshipTypeEdgePlan
    }
  },
  UpdateUserPayload: {
    assertStep: ObjectStep,
    plans: {
      clientMutationId: getClientMutationIdForCreatePlan,
      query: queryPlan,
      user: planCreatePayloadResult,
      userEdge: CreateUserPayload_userEdgePlan
    }
  },
  User: {
    assertStep: assertPgClassSingleStep,
    plans: {
      authoredPullRequestComments: {
        plan($record) {
          const $records = spec_resource_pull_request_commentPgResource.find({
            author_id: $record.get("id")
          });
          return connection($records);
        },
        args: {
          first: applyFirstArg,
          last: applyLastArg,
          offset: applyOffsetArg,
          before: applyBeforeArg,
          after: applyAfterArg,
          condition: applyConditionArgToConnection,
          filter: RepositoryRelationship_repositoryRelationshipMetadataByRelationshipIdfilterApplyPlan,
          orderBy: applyOrderByArgToConnection
        }
      },
      authoredPullRequests: {
        plan($record) {
          const $records = spec_resource_pull_requestPgResource.find({
            author_id: $record.get("id")
          });
          return connection($records);
        },
        args: {
          first: applyFirstArg,
          last: applyLastArg,
          offset: applyOffsetArg,
          before: applyBeforeArg,
          after: applyAfterArg,
          condition: applyConditionArgToConnection,
          filter: RepositoryRelationship_repositoryRelationshipMetadataByRelationshipIdfilterApplyPlan,
          orderBy: applyOrderByArgToConnection
        }
      },
      avatarUrl: Organization_avatarUrlPlan,
      createdAt: RepositoryRelationshipMetadatum_createdAtPlan,
      id($parent) {
        const specifier = nodeIdHandler_User.plan($parent);
        return lambda(specifier, nodeIdCodecs[nodeIdHandler_User.codec.name].encode);
      },
      identityProviderId($record) {
        return $record.get("identity_provider_id");
      },
      pullRequestsByMergedById: {
        plan($record) {
          const $records = spec_resource_pull_requestPgResource.find({
            merged_by_id: $record.get("id")
          });
          return connection($records);
        },
        args: {
          first: applyFirstArg,
          last: applyLastArg,
          offset: applyOffsetArg,
          before: applyBeforeArg,
          after: applyAfterArg,
          condition: applyConditionArgToConnection,
          filter: RepositoryRelationship_repositoryRelationshipMetadataByRelationshipIdfilterApplyPlan,
          orderBy: applyOrderByArgToConnection
        }
      },
      repositoriesByOwnerId: {
        plan($record) {
          const $records = spec_resource_repositoryPgResource.find({
            owner_id: $record.get("id")
          });
          return connection($records);
        },
        args: {
          first: applyFirstArg,
          last: applyLastArg,
          offset: applyOffsetArg,
          before: applyBeforeArg,
          after: applyAfterArg,
          condition: applyConditionArgToConnection,
          filter: RepositoryRelationship_repositoryRelationshipMetadataByRelationshipIdfilterApplyPlan,
          orderBy: applyOrderByArgToConnection
        }
      },
      repositoryCollaborators: {
        plan($record) {
          const $records = spec_resource_repository_collaboratorPgResource.find({
            user_id: $record.get("id")
          });
          return connection($records);
        },
        args: {
          first: applyFirstArg,
          last: applyLastArg,
          offset: applyOffsetArg,
          before: applyBeforeArg,
          after: applyAfterArg,
          condition: applyConditionArgToConnection,
          filter: RepositoryRelationship_repositoryRelationshipMetadataByRelationshipIdfilterApplyPlan,
          orderBy: applyOrderByArgToConnection
        }
      },
      reviewedPullRequestReviews: {
        plan($record) {
          const $records = spec_resource_pull_request_reviewPgResource.find({
            reviewer_id: $record.get("id")
          });
          return connection($records);
        },
        args: {
          first: applyFirstArg,
          last: applyLastArg,
          offset: applyOffsetArg,
          before: applyBeforeArg,
          after: applyAfterArg,
          condition: applyConditionArgToConnection,
          filter: RepositoryRelationship_repositoryRelationshipMetadataByRelationshipIdfilterApplyPlan,
          orderBy: applyOrderByArgToConnection
        }
      },
      rowId: RepositoryRelationshipMetadatum_rowIdPlan,
      updatedAt: RepositoryRelationship_updatedAtPlan
    },
    planType($specifier) {
      const spec = Object.create(null);
      for (const pkCol of userUniques[0].attributes) spec[pkCol] = get2($specifier, pkCol);
      return spec_resource_userPgResource.get(spec);
    }
  },
  UserAggregates: {
    assertStep: assertPgClassSingleStep,
    plans: {
      distinctCount: pgAggregatesPlanAggregates,
      keys: RepositoryCollaboratorAggregates_keysPlan
    }
  },
  UserConnection: {
    assertStep: ConnectionStep,
    plans: {
      aggregates: pgAggregatesCloneSubplanWithoutPaginationSingle,
      groupedAggregates: {
        plan: pgAggregateCloneSubplanWithoutPaginationAsAggregate,
        args: {
          groupBy: pgAggregatesApplyGroupedAggregate,
          having: pgAggregatesApplyConditionsToGroupedAggregates
        }
      },
      totalCount: totalCountConnectionPlan
    }
  },
  UserDistinctCountAggregates: {
    plans: {
      avatarUrl: UserDistinctCountAggregates_avatarUrlPlan,
      bio($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.text, "bio", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
      },
      createdAt: RepositoryCollaboratorDistinctCountAggregates_createdAtPlan,
      email($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.text, "email", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
      },
      identityProviderId($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.uuid, "identity_provider_id", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
      },
      name: RepositoryDistinctCountAggregates_namePlan,
      rowId: PullRequestReviewDistinctCountAggregates_rowIdPlan,
      updatedAt: RepositoryCollaboratorDistinctCountAggregates_updatedAtPlan,
      username($pgSelectSingle) {
        return pgAggregatesPlanAggregateAttribute(TYPES.text, "username", TYPES.bigint, pgAggregateSpec_distinctCount, $pgSelectSingle);
      }
    }
  }
};
export const interfaces = {
  GitObject: {
    resolveType(obj) {
      return obj?.__typename ?? null;
    }
  },
  Node: {
    planType($nodeId) {
      const $specifier = decodeNodeId($nodeId);
      return {
        $__typename: lambda($specifier, findTypeNameMatch, !0),
        planForType(type) {
          const spec = nodeIdHandlerByTypeName[type.name];
          if (spec) return spec.get(spec.getSpec(access($specifier, [spec.codec.name])));else throw Error(`Failed to find handler for ${type.name}`);
        }
      };
    }
  }
};
export const inputObjects = {
  BigFloatFilter: {
    plans: {
      distinctFrom: pgAggregatesApply_distinctFrom,
      equalTo: pgAggregatesApply_equalTo,
      greaterThan: pgAggregatesApply_greaterThan,
      greaterThanOrEqualTo: pgAggregatesApply_greaterThanOrEqualTo,
      in: pgAggregatesApply_in,
      isNull: pgAggregatesApply_isNull,
      lessThan: pgAggregatesApply_lessThan,
      lessThanOrEqualTo: pgAggregatesApply_lessThanOrEqualTo,
      notDistinctFrom: pgAggregatesApply_notDistinctFrom,
      notEqualTo: pgAggregatesApply_notEqualTo,
      notIn: pgAggregatesApply_notIn
    }
  },
  BigIntFilter: {
    plans: {
      distinctFrom: pgAggregatesApply_distinctFrom,
      equalTo: pgAggregatesApply_equalTo,
      greaterThan: pgAggregatesApply_greaterThan,
      greaterThanOrEqualTo: pgAggregatesApply_greaterThanOrEqualTo,
      in: pgAggregatesApply_in,
      isNull: pgAggregatesApply_isNull,
      lessThan: pgAggregatesApply_lessThan,
      lessThanOrEqualTo: pgAggregatesApply_lessThanOrEqualTo,
      notDistinctFrom: pgAggregatesApply_notDistinctFrom,
      notEqualTo: pgAggregatesApply_notEqualTo,
      notIn: pgAggregatesApply_notIn
    }
  },
  BooleanFilter: {
    plans: {
      distinctFrom: pgAggregatesApply_distinctFrom,
      equalTo: pgAggregatesApply_equalTo,
      greaterThan: pgAggregatesApply_greaterThan,
      greaterThanOrEqualTo: pgAggregatesApply_greaterThanOrEqualTo,
      in: pgAggregatesApply_in,
      isNull: pgAggregatesApply_isNull,
      lessThan: pgAggregatesApply_lessThan,
      lessThanOrEqualTo: pgAggregatesApply_lessThanOrEqualTo,
      notDistinctFrom: pgAggregatesApply_notDistinctFrom,
      notEqualTo: pgAggregatesApply_notEqualTo,
      notIn: pgAggregatesApply_notIn
    }
  },
  CreateExternalDependencyInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate,
      externalDependency: applyCreateFields
    }
  },
  CreateOrganizationInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate,
      organization: applyCreateFields
    }
  },
  CreatePullRequestCommentInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate,
      pullRequestComment: applyCreateFields
    }
  },
  CreatePullRequestInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate,
      pullRequest: applyCreateFields
    }
  },
  CreatePullRequestReviewInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate,
      pullRequestReview: applyCreateFields
    }
  },
  CreateRepositoryCollaboratorInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate,
      repositoryCollaborator: applyCreateFields
    }
  },
  CreateRepositoryInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate,
      repository: applyCreateFields
    }
  },
  CreateRepositoryRelationshipInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate,
      repositoryRelationship: applyCreateFields
    }
  },
  CreateRepositoryRelationshipMetadatumInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate,
      repositoryRelationshipMetadatum: applyCreateFields
    }
  },
  CreateRepositoryRelationshipTypeInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate,
      repositoryRelationshipType: applyCreateFields
    }
  },
  CreateUserInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate,
      user: applyCreateFields
    }
  },
  DatetimeFilter: {
    plans: {
      distinctFrom: pgAggregatesApply_distinctFrom,
      equalTo: pgAggregatesApply_equalTo,
      greaterThan: pgAggregatesApply_greaterThan,
      greaterThanOrEqualTo: pgAggregatesApply_greaterThanOrEqualTo,
      in: pgAggregatesApply_in,
      isNull: pgAggregatesApply_isNull,
      lessThan: pgAggregatesApply_lessThan,
      lessThanOrEqualTo: pgAggregatesApply_lessThanOrEqualTo,
      notDistinctFrom: pgAggregatesApply_notDistinctFrom,
      notEqualTo: pgAggregatesApply_notEqualTo,
      notIn: pgAggregatesApply_notIn
    }
  },
  DeleteExternalDependencyByIdInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate
    }
  },
  DeleteExternalDependencyInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate
    }
  },
  DeleteOrganizationByIdInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate
    }
  },
  DeleteOrganizationInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate
    }
  },
  DeletePullRequestByIdInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate
    }
  },
  DeletePullRequestCommentByIdInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate
    }
  },
  DeletePullRequestCommentInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate
    }
  },
  DeletePullRequestInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate
    }
  },
  DeletePullRequestReviewByIdInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate
    }
  },
  DeletePullRequestReviewInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate
    }
  },
  DeleteRepositoryByIdInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate
    }
  },
  DeleteRepositoryCollaboratorByIdInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate
    }
  },
  DeleteRepositoryCollaboratorInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate
    }
  },
  DeleteRepositoryInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate
    }
  },
  DeleteRepositoryRelationshipByIdInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate
    }
  },
  DeleteRepositoryRelationshipInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate
    }
  },
  DeleteRepositoryRelationshipMetadatumByIdInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate
    }
  },
  DeleteRepositoryRelationshipMetadatumInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate
    }
  },
  DeleteRepositoryRelationshipTypeByIdInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate
    }
  },
  DeleteRepositoryRelationshipTypeInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate
    }
  },
  DeleteUserByIdInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate
    }
  },
  DeleteUserInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate
    }
  },
  ExternalDependencyAggregatesFilter: {
    plans: {
      distinctCount: RepositoryAggregatesFilter_distinctCountApply,
      filter: filterApply
    }
  },
  ExternalDependencyCondition: {
    plans: {
      createdAt: RepositoryCondition_createdAtApply,
      detectionSource: ExternalDependencyCondition_detectionSourceApply,
      packageManager($condition, val) {
        return applyAttributeCondition("package_manager", TYPES.text, $condition, val);
      },
      packageName($condition, val) {
        return applyAttributeCondition("package_name", TYPES.text, $condition, val);
      },
      repositoryId: RepositoryCollaboratorCondition_repositoryIdApply,
      rowId: RepositoryCondition_rowIdApply,
      versionConstraint: ExternalDependencyCondition_versionConstraintApply
    }
  },
  ExternalDependencyDistinctCountAggregateFilter: {
    plans: {
      createdAt: RepositoryDistinctCountAggregateFilter_createdAtApply,
      detectionSource: ExternalDependencyDistinctCountAggregateFilter_detectionSourceApply,
      packageManager($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "package_manager", TYPES.bigint, TYPES.text, $parent, input);
      },
      packageName($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "package_name", TYPES.bigint, TYPES.text, $parent, input);
      },
      repositoryId: RepositoryCollaboratorDistinctCountAggregateFilter_repositoryIdApply,
      rowId: RepositoryDistinctCountAggregateFilter_rowIdApply,
      versionConstraint: ExternalDependencyDistinctCountAggregateFilter_versionConstraintApply
    }
  },
  ExternalDependencyFilter: {
    plans: {
      and: RepositoryFilter_andApply,
      createdAt(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("createdAt", "created_at", spec_externalDependency.attributes.created_at, queryBuilder, value);
      },
      detectionSource(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("detectionSource", "detection_source", spec_externalDependency.attributes.detection_source, queryBuilder, value);
      },
      not: RepositoryFilter_notApply,
      or: RepositoryFilter_orApply,
      packageManager(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("packageManager", "package_manager", spec_externalDependency.attributes.package_manager, queryBuilder, value);
      },
      packageName(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("packageName", "package_name", spec_externalDependency.attributes.package_name, queryBuilder, value);
      },
      repository($where, value) {
        return pgConnectionFilterApplySingleRelation(spec_resource_repositoryPgResource, repositoryIdentifier, registryConfig.pgRelations.externalDependency.repositoryByMyRepositoryId.localAttributes, registryConfig.pgRelations.externalDependency.repositoryByMyRepositoryId.remoteAttributes, $where, value);
      },
      repositoryId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("repositoryId", "repository_id", spec_externalDependency.attributes.repository_id, queryBuilder, value);
      },
      rowId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("rowId", "id", spec_externalDependency.attributes.id, queryBuilder, value);
      },
      versionConstraint(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("versionConstraint", "version_constraint", spec_externalDependency.attributes.version_constraint, queryBuilder, value);
      }
    }
  },
  ExternalDependencyHavingAverageInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_average, spec_externalDependency.attributes.created_at, "created_at", $having);
      }
    }
  },
  ExternalDependencyHavingDistinctCountInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_distinctCount, spec_externalDependency.attributes.created_at, "created_at", $having);
      }
    }
  },
  ExternalDependencyHavingInput: {
    plans: {
      AND: pgAggregatesApplyAnd,
      average: pgAggregatesPlanAggregatesField,
      distinctCount: pgAggregatesPlanAggregatesField,
      max: pgAggregatesPlanAggregatesField,
      min: pgAggregatesPlanAggregatesField,
      OR: RepositoryCollaboratorHavingInput_ORApply,
      stddevPopulation: pgAggregatesPlanAggregatesField,
      stddevSample: pgAggregatesPlanAggregatesField,
      sum: pgAggregatesPlanAggregatesField,
      variancePopulation: pgAggregatesPlanAggregatesField,
      varianceSample: pgAggregatesPlanAggregatesField
    }
  },
  ExternalDependencyHavingMaxInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_max, spec_externalDependency.attributes.created_at, "created_at", $having);
      }
    }
  },
  ExternalDependencyHavingMinInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_min, spec_externalDependency.attributes.created_at, "created_at", $having);
      }
    }
  },
  ExternalDependencyHavingStddevPopulationInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevPopulation, spec_externalDependency.attributes.created_at, "created_at", $having);
      }
    }
  },
  ExternalDependencyHavingStddevSampleInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevSample, spec_externalDependency.attributes.created_at, "created_at", $having);
      }
    }
  },
  ExternalDependencyHavingSumInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_sum, spec_externalDependency.attributes.created_at, "created_at", $having);
      }
    }
  },
  ExternalDependencyHavingVariancePopulationInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_variancePopulation, spec_externalDependency.attributes.created_at, "created_at", $having);
      }
    }
  },
  ExternalDependencyHavingVarianceSampleInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_varianceSample, spec_externalDependency.attributes.created_at, "created_at", $having);
      }
    }
  },
  ExternalDependencyInput: {
    baked: createObjectAndApplyChildren,
    plans: {
      createdAt: RepositoryRelationshipMetadatumInput_createdAtApply,
      detectionSource: ExternalDependencyInput_detectionSourceApply,
      packageManager: ExternalDependencyInput_packageManagerApply,
      packageName: ExternalDependencyInput_packageNameApply,
      repositoryId: ExternalDependencyInput_repositoryIdApply,
      rowId: RepositoryRelationshipMetadatumInput_rowIdApply,
      versionConstraint: ExternalDependencyInput_versionConstraintApply
    }
  },
  ExternalDependencyPatch: {
    baked: createObjectAndApplyChildren,
    plans: {
      createdAt: RepositoryRelationshipMetadatumInput_createdAtApply,
      detectionSource: ExternalDependencyInput_detectionSourceApply,
      packageManager: ExternalDependencyInput_packageManagerApply,
      packageName: ExternalDependencyInput_packageNameApply,
      repositoryId: ExternalDependencyInput_repositoryIdApply,
      rowId: RepositoryRelationshipMetadatumInput_rowIdApply,
      versionConstraint: ExternalDependencyInput_versionConstraintApply
    }
  },
  FloatFilter: {
    plans: {
      distinctFrom: pgAggregatesApply_distinctFrom,
      equalTo: pgAggregatesApply_equalTo,
      greaterThan: pgAggregatesApply_greaterThan,
      greaterThanOrEqualTo: pgAggregatesApply_greaterThanOrEqualTo,
      in: pgAggregatesApply_in,
      isNull: pgAggregatesApply_isNull,
      lessThan: pgAggregatesApply_lessThan,
      lessThanOrEqualTo: pgAggregatesApply_lessThanOrEqualTo,
      notDistinctFrom: pgAggregatesApply_notDistinctFrom,
      notEqualTo: pgAggregatesApply_notEqualTo,
      notIn: pgAggregatesApply_notIn
    }
  },
  HavingDatetimeFilter: {
    plans: {
      equalTo($booleanFilter, input) {
        return pgAggregatesApplyHavingBinaryOperation(TYPES.timestamptz, infix, $booleanFilter, input);
      },
      greaterThan($booleanFilter, input) {
        return pgAggregatesApplyHavingBinaryOperation(TYPES.timestamptz, infix3, $booleanFilter, input);
      },
      greaterThanOrEqualTo($booleanFilter, input) {
        return pgAggregatesApplyHavingBinaryOperation(TYPES.timestamptz, infix4, $booleanFilter, input);
      },
      lessThan($booleanFilter, input) {
        return pgAggregatesApplyHavingBinaryOperation(TYPES.timestamptz, infix5, $booleanFilter, input);
      },
      lessThanOrEqualTo($booleanFilter, input) {
        return pgAggregatesApplyHavingBinaryOperation(TYPES.timestamptz, infix6, $booleanFilter, input);
      },
      notEqualTo($booleanFilter, input) {
        return pgAggregatesApplyHavingBinaryOperation(TYPES.timestamptz, infix2, $booleanFilter, input);
      }
    }
  },
  HavingFloatFilter: {
    plans: {
      equalTo($booleanFilter, input) {
        return pgAggregatesApplyHavingBinaryOperation(TYPES.float, infix, $booleanFilter, input);
      },
      greaterThan($booleanFilter, input) {
        return pgAggregatesApplyHavingBinaryOperation(TYPES.float, infix3, $booleanFilter, input);
      },
      greaterThanOrEqualTo($booleanFilter, input) {
        return pgAggregatesApplyHavingBinaryOperation(TYPES.float, infix4, $booleanFilter, input);
      },
      lessThan($booleanFilter, input) {
        return pgAggregatesApplyHavingBinaryOperation(TYPES.float, infix5, $booleanFilter, input);
      },
      lessThanOrEqualTo($booleanFilter, input) {
        return pgAggregatesApplyHavingBinaryOperation(TYPES.float, infix6, $booleanFilter, input);
      },
      notEqualTo($booleanFilter, input) {
        return pgAggregatesApplyHavingBinaryOperation(TYPES.float, infix2, $booleanFilter, input);
      }
    }
  },
  HavingIntFilter: {
    plans: {
      equalTo($booleanFilter, input) {
        return pgAggregatesApplyHavingBinaryOperation(TYPES.int, infix, $booleanFilter, input);
      },
      greaterThan($booleanFilter, input) {
        return pgAggregatesApplyHavingBinaryOperation(TYPES.int, infix3, $booleanFilter, input);
      },
      greaterThanOrEqualTo($booleanFilter, input) {
        return pgAggregatesApplyHavingBinaryOperation(TYPES.int, infix4, $booleanFilter, input);
      },
      lessThan($booleanFilter, input) {
        return pgAggregatesApplyHavingBinaryOperation(TYPES.int, infix5, $booleanFilter, input);
      },
      lessThanOrEqualTo($booleanFilter, input) {
        return pgAggregatesApplyHavingBinaryOperation(TYPES.int, infix6, $booleanFilter, input);
      },
      notEqualTo($booleanFilter, input) {
        return pgAggregatesApplyHavingBinaryOperation(TYPES.int, infix2, $booleanFilter, input);
      }
    }
  },
  IntFilter: {
    plans: {
      distinctFrom: pgAggregatesApply_distinctFrom,
      equalTo: pgAggregatesApply_equalTo,
      greaterThan: pgAggregatesApply_greaterThan,
      greaterThanOrEqualTo: pgAggregatesApply_greaterThanOrEqualTo,
      in: pgAggregatesApply_in,
      isNull: pgAggregatesApply_isNull,
      lessThan: pgAggregatesApply_lessThan,
      lessThanOrEqualTo: pgAggregatesApply_lessThanOrEqualTo,
      notDistinctFrom: pgAggregatesApply_notDistinctFrom,
      notEqualTo: pgAggregatesApply_notEqualTo,
      notIn: pgAggregatesApply_notIn
    }
  },
  OrganizationCondition: {
    plans: {
      avatarUrl: UserCondition_avatarUrlApply,
      billingAccountId($condition, val) {
        return applyAttributeCondition("billing_account_id", TYPES.text, $condition, val);
      },
      createdAt: RepositoryCondition_createdAtApply,
      deletedAt($condition, val) {
        return applyAttributeCondition("deleted_at", TYPES.timestamp, $condition, val);
      },
      deletionReason($condition, val) {
        return applyAttributeCondition("deletion_reason", TYPES.text, $condition, val);
      },
      description: RepositoryCondition_descriptionApply,
      idpOrganizationId($condition, val) {
        return applyAttributeCondition("idp_organization_id", TYPES.text, $condition, val);
      },
      rowId: RepositoryCondition_rowIdApply,
      subscriptionId($condition, val) {
        return applyAttributeCondition("subscription_id", TYPES.text, $condition, val);
      },
      updatedAt: RepositoryCondition_updatedAtApply
    }
  },
  OrganizationFilter: {
    plans: {
      and: RepositoryFilter_andApply,
      avatarUrl(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("avatarUrl", "avatar_url", spec_organization.attributes.avatar_url, queryBuilder, value);
      },
      billingAccountId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("billingAccountId", "billing_account_id", spec_organization.attributes.billing_account_id, queryBuilder, value);
      },
      createdAt(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("createdAt", "created_at", spec_organization.attributes.created_at, queryBuilder, value);
      },
      deletedAt(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("deletedAt", "deleted_at", spec_organization.attributes.deleted_at, queryBuilder, value);
      },
      deletionReason(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("deletionReason", "deletion_reason", spec_organization.attributes.deletion_reason, queryBuilder, value);
      },
      description(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("description", "description", spec_organization.attributes.description, queryBuilder, value);
      },
      idpOrganizationId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("idpOrganizationId", "idp_organization_id", spec_organization.attributes.idp_organization_id, queryBuilder, value);
      },
      not: RepositoryFilter_notApply,
      or: RepositoryFilter_orApply,
      repositories($where, value) {
        assertAllowed(value, "object");
        const $rel = $where.andPlan();
        $rel.extensions.pgFilterRelation = {
          tableExpression: repositoryIdentifier,
          alias: spec_resource_repositoryPgResource.name,
          localAttributes: registryConfig.pgRelations.organization.repositoriesByTheirOrganizationId.localAttributes,
          remoteAttributes: registryConfig.pgRelations.organization.repositoriesByTheirOrganizationId.remoteAttributes
        };
        return $rel;
      },
      repositoriesExist($where, value) {
        assertAllowed(value, "scalar");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: repositoryIdentifier,
          alias: spec_resource_repositoryPgResource.name,
          equals: value
        });
        registryConfig.pgRelations.organization.repositoriesByTheirOrganizationId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.organization.repositoriesByTheirOrganizationId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
      },
      repositoryRelationshipTypes($where, value) {
        assertAllowed(value, "object");
        const $rel = $where.andPlan();
        $rel.extensions.pgFilterRelation = {
          tableExpression: repositoryRelationshipTypeIdentifier,
          alias: spec_resource_repository_relationship_typePgResource.name,
          localAttributes: registryConfig.pgRelations.organization.repositoryRelationshipTypesByTheirOrganizationId.localAttributes,
          remoteAttributes: registryConfig.pgRelations.organization.repositoryRelationshipTypesByTheirOrganizationId.remoteAttributes
        };
        return $rel;
      },
      repositoryRelationshipTypesExist($where, value) {
        assertAllowed(value, "scalar");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: repositoryRelationshipTypeIdentifier,
          alias: spec_resource_repository_relationship_typePgResource.name,
          equals: value
        });
        registryConfig.pgRelations.organization.repositoryRelationshipTypesByTheirOrganizationId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.organization.repositoryRelationshipTypesByTheirOrganizationId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
      },
      rowId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("rowId", "id", spec_organization.attributes.id, queryBuilder, value);
      },
      subscriptionId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("subscriptionId", "subscription_id", spec_organization.attributes.subscription_id, queryBuilder, value);
      },
      updatedAt(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("updatedAt", "updated_at", spec_organization.attributes.updated_at, queryBuilder, value);
      }
    }
  },
  OrganizationHavingAverageInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_average, spec_organization.attributes.created_at, "created_at", $having);
      },
      deletedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_average, spec_organization.attributes.deleted_at, "deleted_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_average, spec_organization.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  OrganizationHavingDistinctCountInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_distinctCount, spec_organization.attributes.created_at, "created_at", $having);
      },
      deletedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_distinctCount, spec_organization.attributes.deleted_at, "deleted_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_distinctCount, spec_organization.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  OrganizationHavingInput: {
    plans: {
      AND: pgAggregatesApplyAnd,
      average: pgAggregatesPlanAggregatesField,
      distinctCount: pgAggregatesPlanAggregatesField,
      max: pgAggregatesPlanAggregatesField,
      min: pgAggregatesPlanAggregatesField,
      OR: RepositoryCollaboratorHavingInput_ORApply,
      stddevPopulation: pgAggregatesPlanAggregatesField,
      stddevSample: pgAggregatesPlanAggregatesField,
      sum: pgAggregatesPlanAggregatesField,
      variancePopulation: pgAggregatesPlanAggregatesField,
      varianceSample: pgAggregatesPlanAggregatesField
    }
  },
  OrganizationHavingMaxInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_max, spec_organization.attributes.created_at, "created_at", $having);
      },
      deletedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_max, spec_organization.attributes.deleted_at, "deleted_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_max, spec_organization.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  OrganizationHavingMinInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_min, spec_organization.attributes.created_at, "created_at", $having);
      },
      deletedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_min, spec_organization.attributes.deleted_at, "deleted_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_min, spec_organization.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  OrganizationHavingStddevPopulationInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevPopulation, spec_organization.attributes.created_at, "created_at", $having);
      },
      deletedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevPopulation, spec_organization.attributes.deleted_at, "deleted_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevPopulation, spec_organization.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  OrganizationHavingStddevSampleInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevSample, spec_organization.attributes.created_at, "created_at", $having);
      },
      deletedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevSample, spec_organization.attributes.deleted_at, "deleted_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevSample, spec_organization.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  OrganizationHavingSumInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_sum, spec_organization.attributes.created_at, "created_at", $having);
      },
      deletedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_sum, spec_organization.attributes.deleted_at, "deleted_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_sum, spec_organization.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  OrganizationHavingVariancePopulationInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_variancePopulation, spec_organization.attributes.created_at, "created_at", $having);
      },
      deletedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_variancePopulation, spec_organization.attributes.deleted_at, "deleted_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_variancePopulation, spec_organization.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  OrganizationHavingVarianceSampleInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_varianceSample, spec_organization.attributes.created_at, "created_at", $having);
      },
      deletedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_varianceSample, spec_organization.attributes.deleted_at, "deleted_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_varianceSample, spec_organization.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  OrganizationInput: {
    baked: createObjectAndApplyChildren,
    plans: {
      avatarUrl: UserInput_avatarUrlApply,
      billingAccountId: OrganizationInput_billingAccountIdApply,
      createdAt: RepositoryRelationshipMetadatumInput_createdAtApply,
      deletedAt: OrganizationInput_deletedAtApply,
      deletionReason: OrganizationInput_deletionReasonApply,
      description: RepositoryRelationshipTypeInput_descriptionApply,
      idpOrganizationId: OrganizationInput_idpOrganizationIdApply,
      rowId: RepositoryRelationshipMetadatumInput_rowIdApply,
      subscriptionId: OrganizationInput_subscriptionIdApply,
      updatedAt: RepositoryCollaboratorInput_updatedAtApply
    }
  },
  OrganizationPatch: {
    baked: createObjectAndApplyChildren,
    plans: {
      avatarUrl: UserInput_avatarUrlApply,
      billingAccountId: OrganizationInput_billingAccountIdApply,
      createdAt: RepositoryRelationshipMetadatumInput_createdAtApply,
      deletedAt: OrganizationInput_deletedAtApply,
      deletionReason: OrganizationInput_deletionReasonApply,
      description: RepositoryRelationshipTypeInput_descriptionApply,
      idpOrganizationId: OrganizationInput_idpOrganizationIdApply,
      rowId: RepositoryRelationshipMetadatumInput_rowIdApply,
      subscriptionId: OrganizationInput_subscriptionIdApply,
      updatedAt: RepositoryCollaboratorInput_updatedAtApply
    }
  },
  OrganizationToManyRepositoryFilter: {
    plans: {
      aggregates: RepositoryToManyRepositoryCollaboratorFilter_aggregatesApply,
      every: RepositoryToManyRepositoryCollaboratorFilter_everyApply,
      none: RepositoryToManyRepositoryCollaboratorFilter_noneApply,
      some: RepositoryToManyRepositoryCollaboratorFilter_someApply
    }
  },
  OrganizationToManyRepositoryRelationshipTypeFilter: {
    plans: {
      aggregates: RepositoryToManyRepositoryCollaboratorFilter_aggregatesApply,
      every: RepositoryToManyRepositoryCollaboratorFilter_everyApply,
      none: RepositoryToManyRepositoryCollaboratorFilter_noneApply,
      some: RepositoryToManyRepositoryCollaboratorFilter_someApply
    }
  },
  PermissionFilter: {
    plans: {
      distinctFrom: pgAggregatesApply_distinctFrom,
      equalTo: pgAggregatesApply_equalTo,
      greaterThan: pgAggregatesApply_greaterThan,
      greaterThanOrEqualTo: pgAggregatesApply_greaterThanOrEqualTo,
      in: pgAggregatesApply_in,
      isNull: pgAggregatesApply_isNull,
      lessThan: pgAggregatesApply_lessThan,
      lessThanOrEqualTo: pgAggregatesApply_lessThanOrEqualTo,
      notDistinctFrom: pgAggregatesApply_notDistinctFrom,
      notEqualTo: pgAggregatesApply_notEqualTo,
      notIn: pgAggregatesApply_notIn
    }
  },
  PullRequestAggregatesFilter: {
    plans: {
      average: PullRequestCommentAggregatesFilter_averageApply,
      distinctCount: RepositoryAggregatesFilter_distinctCountApply,
      filter: filterApply,
      max: PullRequestCommentAggregatesFilter_maxApply,
      min: PullRequestCommentAggregatesFilter_minApply,
      stddevPopulation: PullRequestCommentAggregatesFilter_stddevPopulationApply,
      stddevSample: PullRequestCommentAggregatesFilter_stddevSampleApply,
      sum: PullRequestCommentAggregatesFilter_sumApply,
      variancePopulation: PullRequestCommentAggregatesFilter_variancePopulationApply,
      varianceSample: PullRequestCommentAggregatesFilter_varianceSampleApply
    }
  },
  PullRequestAverageAggregateFilter: {
    plans: {
      number($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_average, "number", TYPES.numeric, TYPES.int, $parent, input);
      }
    }
  },
  PullRequestCommentAggregatesFilter: {
    plans: {
      average: PullRequestCommentAggregatesFilter_averageApply,
      distinctCount: RepositoryAggregatesFilter_distinctCountApply,
      filter: filterApply,
      max: PullRequestCommentAggregatesFilter_maxApply,
      min: PullRequestCommentAggregatesFilter_minApply,
      stddevPopulation: PullRequestCommentAggregatesFilter_stddevPopulationApply,
      stddevSample: PullRequestCommentAggregatesFilter_stddevSampleApply,
      sum: PullRequestCommentAggregatesFilter_sumApply,
      variancePopulation: PullRequestCommentAggregatesFilter_variancePopulationApply,
      varianceSample: PullRequestCommentAggregatesFilter_varianceSampleApply
    }
  },
  PullRequestCommentAverageAggregateFilter: {
    plans: {
      line($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_average, "line", TYPES.numeric, TYPES.int, $parent, input);
      }
    }
  },
  PullRequestCommentCondition: {
    plans: {
      authorId: PullRequestCommentCondition_authorIdApply,
      body: PullRequestCommentCondition_bodyApply,
      commitSha($condition, val) {
        return applyAttributeCondition("commit_sha", TYPES.text, $condition, val);
      },
      createdAt: RepositoryCondition_createdAtApply,
      line($condition, val) {
        return applyAttributeCondition("line", TYPES.int, $condition, val);
      },
      path($condition, val) {
        return applyAttributeCondition("path", TYPES.text, $condition, val);
      },
      pullRequestId: PullRequestCommentCondition_pullRequestIdApply,
      replyToId($condition, val) {
        return applyAttributeCondition("reply_to_id", TYPES.uuid, $condition, val);
      },
      rowId: RepositoryCondition_rowIdApply,
      side($condition, val) {
        return applyAttributeCondition("side", TYPES.text, $condition, val);
      },
      updatedAt: RepositoryCondition_updatedAtApply
    }
  },
  PullRequestCommentDistinctCountAggregateFilter: {
    plans: {
      authorId: PullRequestCommentDistinctCountAggregateFilter_authorIdApply,
      body: PullRequestCommentDistinctCountAggregateFilter_bodyApply,
      commitSha($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "commit_sha", TYPES.bigint, TYPES.text, $parent, input);
      },
      createdAt: RepositoryDistinctCountAggregateFilter_createdAtApply,
      line($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "line", TYPES.bigint, TYPES.int, $parent, input);
      },
      path($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "path", TYPES.bigint, TYPES.text, $parent, input);
      },
      pullRequestId: PullRequestCommentDistinctCountAggregateFilter_pullRequestIdApply,
      replyToId($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "reply_to_id", TYPES.bigint, TYPES.uuid, $parent, input);
      },
      rowId: RepositoryDistinctCountAggregateFilter_rowIdApply,
      side($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "side", TYPES.bigint, TYPES.text, $parent, input);
      },
      updatedAt: RepositoryDistinctCountAggregateFilter_updatedAtApply
    }
  },
  PullRequestCommentFilter: {
    plans: {
      and: RepositoryFilter_andApply,
      author($where, value) {
        return pgConnectionFilterApplySingleRelation(spec_resource_userPgResource, userIdentifier, registryConfig.pgRelations.pullRequestComment.userByMyAuthorId.localAttributes, registryConfig.pgRelations.pullRequestComment.userByMyAuthorId.remoteAttributes, $where, value);
      },
      authorId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("authorId", "author_id", spec_pullRequestComment.attributes.author_id, queryBuilder, value);
      },
      body(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("body", "body", spec_pullRequestComment.attributes.body, queryBuilder, value);
      },
      commitSha(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("commitSha", "commit_sha", spec_pullRequestComment.attributes.commit_sha, queryBuilder, value);
      },
      createdAt(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("createdAt", "created_at", spec_pullRequestComment.attributes.created_at, queryBuilder, value);
      },
      line(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("line", "line", spec_pullRequestComment.attributes.line, queryBuilder, value);
      },
      not: RepositoryFilter_notApply,
      or: RepositoryFilter_orApply,
      path(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("path", "path", spec_pullRequestComment.attributes.path, queryBuilder, value);
      },
      pullRequest($where, value) {
        return pgConnectionFilterApplySingleRelation(spec_resource_pull_requestPgResource, pullRequestIdentifier, registryConfig.pgRelations.pullRequestComment.pullRequestByMyPullRequestId.localAttributes, registryConfig.pgRelations.pullRequestComment.pullRequestByMyPullRequestId.remoteAttributes, $where, value);
      },
      pullRequestId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("pullRequestId", "pull_request_id", spec_pullRequestComment.attributes.pull_request_id, queryBuilder, value);
      },
      replyToId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("replyToId", "reply_to_id", spec_pullRequestComment.attributes.reply_to_id, queryBuilder, value);
      },
      rowId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("rowId", "id", spec_pullRequestComment.attributes.id, queryBuilder, value);
      },
      side(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("side", "side", spec_pullRequestComment.attributes.side, queryBuilder, value);
      },
      updatedAt(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("updatedAt", "updated_at", spec_pullRequestComment.attributes.updated_at, queryBuilder, value);
      }
    }
  },
  PullRequestCommentHavingAverageInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_average, spec_pullRequestComment.attributes.created_at, "created_at", $having);
      },
      line($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_average, spec_pullRequestComment.attributes.line, "line", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_average, spec_pullRequestComment.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  PullRequestCommentHavingDistinctCountInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.created_at, "created_at", $having);
      },
      line($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.line, "line", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  PullRequestCommentHavingInput: {
    plans: {
      AND: pgAggregatesApplyAnd,
      average: pgAggregatesPlanAggregatesField,
      distinctCount: pgAggregatesPlanAggregatesField,
      max: pgAggregatesPlanAggregatesField,
      min: pgAggregatesPlanAggregatesField,
      OR: RepositoryCollaboratorHavingInput_ORApply,
      stddevPopulation: pgAggregatesPlanAggregatesField,
      stddevSample: pgAggregatesPlanAggregatesField,
      sum: pgAggregatesPlanAggregatesField,
      variancePopulation: pgAggregatesPlanAggregatesField,
      varianceSample: pgAggregatesPlanAggregatesField
    }
  },
  PullRequestCommentHavingMaxInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_max, spec_pullRequestComment.attributes.created_at, "created_at", $having);
      },
      line($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_max, spec_pullRequestComment.attributes.line, "line", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_max, spec_pullRequestComment.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  PullRequestCommentHavingMinInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_min, spec_pullRequestComment.attributes.created_at, "created_at", $having);
      },
      line($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_min, spec_pullRequestComment.attributes.line, "line", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_min, spec_pullRequestComment.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  PullRequestCommentHavingStddevPopulationInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevPopulation, spec_pullRequestComment.attributes.created_at, "created_at", $having);
      },
      line($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevPopulation, spec_pullRequestComment.attributes.line, "line", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevPopulation, spec_pullRequestComment.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  PullRequestCommentHavingStddevSampleInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevSample, spec_pullRequestComment.attributes.created_at, "created_at", $having);
      },
      line($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevSample, spec_pullRequestComment.attributes.line, "line", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevSample, spec_pullRequestComment.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  PullRequestCommentHavingSumInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_sum, spec_pullRequestComment.attributes.created_at, "created_at", $having);
      },
      line($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_sum, spec_pullRequestComment.attributes.line, "line", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_sum, spec_pullRequestComment.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  PullRequestCommentHavingVariancePopulationInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_variancePopulation, spec_pullRequestComment.attributes.created_at, "created_at", $having);
      },
      line($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_variancePopulation, spec_pullRequestComment.attributes.line, "line", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_variancePopulation, spec_pullRequestComment.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  PullRequestCommentHavingVarianceSampleInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_varianceSample, spec_pullRequestComment.attributes.created_at, "created_at", $having);
      },
      line($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_varianceSample, spec_pullRequestComment.attributes.line, "line", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_varianceSample, spec_pullRequestComment.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  PullRequestCommentInput: {
    baked: createObjectAndApplyChildren,
    plans: {
      authorId: PullRequestCommentInput_authorIdApply,
      body: PullRequestReviewInput_bodyApply,
      commitSha: PullRequestCommentInput_commitShaApply,
      createdAt: RepositoryRelationshipMetadatumInput_createdAtApply,
      line: PullRequestCommentInput_lineApply,
      path: PullRequestCommentInput_pathApply,
      pullRequestId: PullRequestReviewInput_pullRequestIdApply,
      replyToId: PullRequestCommentInput_replyToIdApply,
      rowId: RepositoryRelationshipMetadatumInput_rowIdApply,
      side: PullRequestCommentInput_sideApply,
      updatedAt: RepositoryCollaboratorInput_updatedAtApply
    }
  },
  PullRequestCommentMaxAggregateFilter: {
    plans: {
      line($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_max, "line", TYPES.int, TYPES.int, $parent, input);
      }
    }
  },
  PullRequestCommentMinAggregateFilter: {
    plans: {
      line($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_min, "line", TYPES.int, TYPES.int, $parent, input);
      }
    }
  },
  PullRequestCommentPatch: {
    baked: createObjectAndApplyChildren,
    plans: {
      authorId: PullRequestCommentInput_authorIdApply,
      body: PullRequestReviewInput_bodyApply,
      commitSha: PullRequestCommentInput_commitShaApply,
      createdAt: RepositoryRelationshipMetadatumInput_createdAtApply,
      line: PullRequestCommentInput_lineApply,
      path: PullRequestCommentInput_pathApply,
      pullRequestId: PullRequestReviewInput_pullRequestIdApply,
      replyToId: PullRequestCommentInput_replyToIdApply,
      rowId: RepositoryRelationshipMetadatumInput_rowIdApply,
      side: PullRequestCommentInput_sideApply,
      updatedAt: RepositoryCollaboratorInput_updatedAtApply
    }
  },
  PullRequestCommentStddevPopulationAggregateFilter: {
    plans: {
      line($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_stddevPopulation, "line", TYPES.numeric, TYPES.int, $parent, input);
      }
    }
  },
  PullRequestCommentStddevSampleAggregateFilter: {
    plans: {
      line($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_stddevSample, "line", TYPES.numeric, TYPES.int, $parent, input);
      }
    }
  },
  PullRequestCommentSumAggregateFilter: {
    plans: {
      line($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_sum, "line", TYPES.bigint, TYPES.int, $parent, input);
      }
    }
  },
  PullRequestCommentVariancePopulationAggregateFilter: {
    plans: {
      line($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_variancePopulation, "line", TYPES.numeric, TYPES.int, $parent, input);
      }
    }
  },
  PullRequestCommentVarianceSampleAggregateFilter: {
    plans: {
      line($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_varianceSample, "line", TYPES.numeric, TYPES.int, $parent, input);
      }
    }
  },
  PullRequestCondition: {
    plans: {
      authorId: PullRequestCommentCondition_authorIdApply,
      closedAt($condition, val) {
        return applyAttributeCondition("closed_at", TYPES.timestamp, $condition, val);
      },
      createdAt: RepositoryCondition_createdAtApply,
      description: RepositoryCondition_descriptionApply,
      mergeCommitSha($condition, val) {
        return applyAttributeCondition("merge_commit_sha", TYPES.text, $condition, val);
      },
      mergedAt($condition, val) {
        return applyAttributeCondition("merged_at", TYPES.timestamp, $condition, val);
      },
      mergedById($condition, val) {
        return applyAttributeCondition("merged_by_id", TYPES.uuid, $condition, val);
      },
      number($condition, val) {
        return applyAttributeCondition("number", TYPES.int, $condition, val);
      },
      repositoryId: RepositoryCollaboratorCondition_repositoryIdApply,
      rowId: RepositoryCondition_rowIdApply,
      sourceBranch($condition, val) {
        return applyAttributeCondition("source_branch", TYPES.text, $condition, val);
      },
      state: PullRequestReviewCondition_stateApply,
      targetBranch($condition, val) {
        return applyAttributeCondition("target_branch", TYPES.text, $condition, val);
      },
      title($condition, val) {
        return applyAttributeCondition("title", TYPES.text, $condition, val);
      },
      updatedAt: RepositoryCondition_updatedAtApply
    }
  },
  PullRequestDistinctCountAggregateFilter: {
    plans: {
      authorId: PullRequestCommentDistinctCountAggregateFilter_authorIdApply,
      closedAt($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "closed_at", TYPES.bigint, TYPES.timestamp, $parent, input);
      },
      createdAt: RepositoryDistinctCountAggregateFilter_createdAtApply,
      description: RepositoryDistinctCountAggregateFilter_descriptionApply,
      mergeCommitSha($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "merge_commit_sha", TYPES.bigint, TYPES.text, $parent, input);
      },
      mergedAt($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "merged_at", TYPES.bigint, TYPES.timestamp, $parent, input);
      },
      mergedById($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "merged_by_id", TYPES.bigint, TYPES.uuid, $parent, input);
      },
      number($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "number", TYPES.bigint, TYPES.int, $parent, input);
      },
      repositoryId: RepositoryCollaboratorDistinctCountAggregateFilter_repositoryIdApply,
      rowId: RepositoryDistinctCountAggregateFilter_rowIdApply,
      sourceBranch($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "source_branch", TYPES.bigint, TYPES.text, $parent, input);
      },
      state: PullRequestReviewDistinctCountAggregateFilter_stateApply,
      targetBranch($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "target_branch", TYPES.bigint, TYPES.text, $parent, input);
      },
      title($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "title", TYPES.bigint, TYPES.text, $parent, input);
      },
      updatedAt: RepositoryDistinctCountAggregateFilter_updatedAtApply
    }
  },
  PullRequestFilter: {
    plans: {
      and: RepositoryFilter_andApply,
      author($where, value) {
        return pgConnectionFilterApplySingleRelation(spec_resource_userPgResource, userIdentifier, registryConfig.pgRelations.pullRequest.userByMyAuthorId.localAttributes, registryConfig.pgRelations.pullRequest.userByMyAuthorId.remoteAttributes, $where, value);
      },
      authorId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("authorId", "author_id", spec_pullRequest.attributes.author_id, queryBuilder, value);
      },
      closedAt(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("closedAt", "closed_at", spec_pullRequest.attributes.closed_at, queryBuilder, value);
      },
      createdAt(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("createdAt", "created_at", spec_pullRequest.attributes.created_at, queryBuilder, value);
      },
      description(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("description", "description", spec_pullRequest.attributes.description, queryBuilder, value);
      },
      mergeCommitSha(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("mergeCommitSha", "merge_commit_sha", spec_pullRequest.attributes.merge_commit_sha, queryBuilder, value);
      },
      mergedAt(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("mergedAt", "merged_at", spec_pullRequest.attributes.merged_at, queryBuilder, value);
      },
      mergedBy($where, value) {
        return pgConnectionFilterApplySingleRelation(spec_resource_userPgResource, userIdentifier, registryConfig.pgRelations.pullRequest.userByMyMergedById.localAttributes, registryConfig.pgRelations.pullRequest.userByMyMergedById.remoteAttributes, $where, value);
      },
      mergedByExists($where, value) {
        return pgConnectionFilterApplyForwardRelationExists(spec_resource_userPgResource, userIdentifier, registryConfig.pgRelations.pullRequest.userByMyMergedById.localAttributes, registryConfig.pgRelations.pullRequest.userByMyMergedById.remoteAttributes, $where, value);
      },
      mergedById(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("mergedById", "merged_by_id", spec_pullRequest.attributes.merged_by_id, queryBuilder, value);
      },
      not: RepositoryFilter_notApply,
      number(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("number", "number", spec_pullRequest.attributes.number, queryBuilder, value);
      },
      or: RepositoryFilter_orApply,
      pullRequestComments($where, value) {
        assertAllowed(value, "object");
        const $rel = $where.andPlan();
        $rel.extensions.pgFilterRelation = {
          tableExpression: pullRequestCommentIdentifier,
          alias: spec_resource_pull_request_commentPgResource.name,
          localAttributes: registryConfig.pgRelations.pullRequest.pullRequestCommentsByTheirPullRequestId.localAttributes,
          remoteAttributes: registryConfig.pgRelations.pullRequest.pullRequestCommentsByTheirPullRequestId.remoteAttributes
        };
        return $rel;
      },
      pullRequestCommentsExist($where, value) {
        assertAllowed(value, "scalar");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: pullRequestCommentIdentifier,
          alias: spec_resource_pull_request_commentPgResource.name,
          equals: value
        });
        registryConfig.pgRelations.pullRequest.pullRequestCommentsByTheirPullRequestId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.pullRequest.pullRequestCommentsByTheirPullRequestId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
      },
      pullRequestReviews($where, value) {
        assertAllowed(value, "object");
        const $rel = $where.andPlan();
        $rel.extensions.pgFilterRelation = {
          tableExpression: pullRequestReviewIdentifier,
          alias: spec_resource_pull_request_reviewPgResource.name,
          localAttributes: registryConfig.pgRelations.pullRequest.pullRequestReviewsByTheirPullRequestId.localAttributes,
          remoteAttributes: registryConfig.pgRelations.pullRequest.pullRequestReviewsByTheirPullRequestId.remoteAttributes
        };
        return $rel;
      },
      pullRequestReviewsExist($where, value) {
        assertAllowed(value, "scalar");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: pullRequestReviewIdentifier,
          alias: spec_resource_pull_request_reviewPgResource.name,
          equals: value
        });
        registryConfig.pgRelations.pullRequest.pullRequestReviewsByTheirPullRequestId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.pullRequest.pullRequestReviewsByTheirPullRequestId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
      },
      repository($where, value) {
        return pgConnectionFilterApplySingleRelation(spec_resource_repositoryPgResource, repositoryIdentifier, registryConfig.pgRelations.pullRequest.repositoryByMyRepositoryId.localAttributes, registryConfig.pgRelations.pullRequest.repositoryByMyRepositoryId.remoteAttributes, $where, value);
      },
      repositoryId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("repositoryId", "repository_id", spec_pullRequest.attributes.repository_id, queryBuilder, value);
      },
      rowId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("rowId", "id", spec_pullRequest.attributes.id, queryBuilder, value);
      },
      sourceBranch(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("sourceBranch", "source_branch", spec_pullRequest.attributes.source_branch, queryBuilder, value);
      },
      state(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("state", "state", spec_pullRequest.attributes.state, queryBuilder, value);
      },
      targetBranch(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("targetBranch", "target_branch", spec_pullRequest.attributes.target_branch, queryBuilder, value);
      },
      title(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("title", "title", spec_pullRequest.attributes.title, queryBuilder, value);
      },
      updatedAt(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("updatedAt", "updated_at", spec_pullRequest.attributes.updated_at, queryBuilder, value);
      }
    }
  },
  PullRequestHavingAverageInput: {
    plans: {
      closedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_average, spec_pullRequest.attributes.closed_at, "closed_at", $having);
      },
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_average, spec_pullRequest.attributes.created_at, "created_at", $having);
      },
      mergedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_average, spec_pullRequest.attributes.merged_at, "merged_at", $having);
      },
      number($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_average, spec_pullRequest.attributes.number, "number", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_average, spec_pullRequest.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  PullRequestHavingDistinctCountInput: {
    plans: {
      closedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.closed_at, "closed_at", $having);
      },
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.created_at, "created_at", $having);
      },
      mergedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.merged_at, "merged_at", $having);
      },
      number($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.number, "number", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  PullRequestHavingInput: {
    plans: {
      AND: pgAggregatesApplyAnd,
      average: pgAggregatesPlanAggregatesField,
      distinctCount: pgAggregatesPlanAggregatesField,
      max: pgAggregatesPlanAggregatesField,
      min: pgAggregatesPlanAggregatesField,
      OR: RepositoryCollaboratorHavingInput_ORApply,
      stddevPopulation: pgAggregatesPlanAggregatesField,
      stddevSample: pgAggregatesPlanAggregatesField,
      sum: pgAggregatesPlanAggregatesField,
      variancePopulation: pgAggregatesPlanAggregatesField,
      varianceSample: pgAggregatesPlanAggregatesField
    }
  },
  PullRequestHavingMaxInput: {
    plans: {
      closedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_max, spec_pullRequest.attributes.closed_at, "closed_at", $having);
      },
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_max, spec_pullRequest.attributes.created_at, "created_at", $having);
      },
      mergedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_max, spec_pullRequest.attributes.merged_at, "merged_at", $having);
      },
      number($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_max, spec_pullRequest.attributes.number, "number", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_max, spec_pullRequest.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  PullRequestHavingMinInput: {
    plans: {
      closedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_min, spec_pullRequest.attributes.closed_at, "closed_at", $having);
      },
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_min, spec_pullRequest.attributes.created_at, "created_at", $having);
      },
      mergedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_min, spec_pullRequest.attributes.merged_at, "merged_at", $having);
      },
      number($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_min, spec_pullRequest.attributes.number, "number", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_min, spec_pullRequest.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  PullRequestHavingStddevPopulationInput: {
    plans: {
      closedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevPopulation, spec_pullRequest.attributes.closed_at, "closed_at", $having);
      },
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevPopulation, spec_pullRequest.attributes.created_at, "created_at", $having);
      },
      mergedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevPopulation, spec_pullRequest.attributes.merged_at, "merged_at", $having);
      },
      number($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevPopulation, spec_pullRequest.attributes.number, "number", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevPopulation, spec_pullRequest.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  PullRequestHavingStddevSampleInput: {
    plans: {
      closedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevSample, spec_pullRequest.attributes.closed_at, "closed_at", $having);
      },
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevSample, spec_pullRequest.attributes.created_at, "created_at", $having);
      },
      mergedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevSample, spec_pullRequest.attributes.merged_at, "merged_at", $having);
      },
      number($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevSample, spec_pullRequest.attributes.number, "number", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevSample, spec_pullRequest.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  PullRequestHavingSumInput: {
    plans: {
      closedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_sum, spec_pullRequest.attributes.closed_at, "closed_at", $having);
      },
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_sum, spec_pullRequest.attributes.created_at, "created_at", $having);
      },
      mergedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_sum, spec_pullRequest.attributes.merged_at, "merged_at", $having);
      },
      number($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_sum, spec_pullRequest.attributes.number, "number", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_sum, spec_pullRequest.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  PullRequestHavingVariancePopulationInput: {
    plans: {
      closedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_variancePopulation, spec_pullRequest.attributes.closed_at, "closed_at", $having);
      },
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_variancePopulation, spec_pullRequest.attributes.created_at, "created_at", $having);
      },
      mergedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_variancePopulation, spec_pullRequest.attributes.merged_at, "merged_at", $having);
      },
      number($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_variancePopulation, spec_pullRequest.attributes.number, "number", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_variancePopulation, spec_pullRequest.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  PullRequestHavingVarianceSampleInput: {
    plans: {
      closedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_varianceSample, spec_pullRequest.attributes.closed_at, "closed_at", $having);
      },
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_varianceSample, spec_pullRequest.attributes.created_at, "created_at", $having);
      },
      mergedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_varianceSample, spec_pullRequest.attributes.merged_at, "merged_at", $having);
      },
      number($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_varianceSample, spec_pullRequest.attributes.number, "number", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_varianceSample, spec_pullRequest.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  PullRequestInput: {
    baked: createObjectAndApplyChildren,
    plans: {
      authorId: PullRequestCommentInput_authorIdApply,
      closedAt: PullRequestInput_closedAtApply,
      createdAt: RepositoryRelationshipMetadatumInput_createdAtApply,
      description: RepositoryRelationshipTypeInput_descriptionApply,
      mergeCommitSha: PullRequestInput_mergeCommitShaApply,
      mergedAt: PullRequestInput_mergedAtApply,
      mergedById: PullRequestInput_mergedByIdApply,
      number: PullRequestInput_numberApply,
      repositoryId: ExternalDependencyInput_repositoryIdApply,
      rowId: RepositoryRelationshipMetadatumInput_rowIdApply,
      sourceBranch: PullRequestInput_sourceBranchApply,
      state: PullRequestReviewInput_stateApply,
      targetBranch: PullRequestInput_targetBranchApply,
      title: PullRequestInput_titleApply,
      updatedAt: RepositoryCollaboratorInput_updatedAtApply
    }
  },
  PullRequestMaxAggregateFilter: {
    plans: {
      number($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_max, "number", TYPES.int, TYPES.int, $parent, input);
      }
    }
  },
  PullRequestMinAggregateFilter: {
    plans: {
      number($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_min, "number", TYPES.int, TYPES.int, $parent, input);
      }
    }
  },
  PullRequestPatch: {
    baked: createObjectAndApplyChildren,
    plans: {
      authorId: PullRequestCommentInput_authorIdApply,
      closedAt: PullRequestInput_closedAtApply,
      createdAt: RepositoryRelationshipMetadatumInput_createdAtApply,
      description: RepositoryRelationshipTypeInput_descriptionApply,
      mergeCommitSha: PullRequestInput_mergeCommitShaApply,
      mergedAt: PullRequestInput_mergedAtApply,
      mergedById: PullRequestInput_mergedByIdApply,
      number: PullRequestInput_numberApply,
      repositoryId: ExternalDependencyInput_repositoryIdApply,
      rowId: RepositoryRelationshipMetadatumInput_rowIdApply,
      sourceBranch: PullRequestInput_sourceBranchApply,
      state: PullRequestReviewInput_stateApply,
      targetBranch: PullRequestInput_targetBranchApply,
      title: PullRequestInput_titleApply,
      updatedAt: RepositoryCollaboratorInput_updatedAtApply
    }
  },
  PullRequestReviewAggregatesFilter: {
    plans: {
      distinctCount: RepositoryAggregatesFilter_distinctCountApply,
      filter: filterApply
    }
  },
  PullRequestReviewCondition: {
    plans: {
      body: PullRequestCommentCondition_bodyApply,
      createdAt: RepositoryCondition_createdAtApply,
      pullRequestId: PullRequestCommentCondition_pullRequestIdApply,
      reviewerId($condition, val) {
        return applyAttributeCondition("reviewer_id", TYPES.uuid, $condition, val);
      },
      rowId: RepositoryCondition_rowIdApply,
      state: PullRequestReviewCondition_stateApply,
      submittedAt($condition, val) {
        return applyAttributeCondition("submitted_at", TYPES.timestamp, $condition, val);
      },
      updatedAt: RepositoryCondition_updatedAtApply
    }
  },
  PullRequestReviewDistinctCountAggregateFilter: {
    plans: {
      body: PullRequestCommentDistinctCountAggregateFilter_bodyApply,
      createdAt: RepositoryDistinctCountAggregateFilter_createdAtApply,
      pullRequestId: PullRequestCommentDistinctCountAggregateFilter_pullRequestIdApply,
      reviewerId($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "reviewer_id", TYPES.bigint, TYPES.uuid, $parent, input);
      },
      rowId: RepositoryDistinctCountAggregateFilter_rowIdApply,
      state: PullRequestReviewDistinctCountAggregateFilter_stateApply,
      submittedAt($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "submitted_at", TYPES.bigint, TYPES.timestamp, $parent, input);
      },
      updatedAt: RepositoryDistinctCountAggregateFilter_updatedAtApply
    }
  },
  PullRequestReviewFilter: {
    plans: {
      and: RepositoryFilter_andApply,
      body(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("body", "body", spec_pullRequestReview.attributes.body, queryBuilder, value);
      },
      createdAt(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("createdAt", "created_at", spec_pullRequestReview.attributes.created_at, queryBuilder, value);
      },
      not: RepositoryFilter_notApply,
      or: RepositoryFilter_orApply,
      pullRequest($where, value) {
        return pgConnectionFilterApplySingleRelation(spec_resource_pull_requestPgResource, pullRequestIdentifier, registryConfig.pgRelations.pullRequestReview.pullRequestByMyPullRequestId.localAttributes, registryConfig.pgRelations.pullRequestReview.pullRequestByMyPullRequestId.remoteAttributes, $where, value);
      },
      pullRequestId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("pullRequestId", "pull_request_id", spec_pullRequestReview.attributes.pull_request_id, queryBuilder, value);
      },
      reviewer($where, value) {
        return pgConnectionFilterApplySingleRelation(spec_resource_userPgResource, userIdentifier, registryConfig.pgRelations.pullRequestReview.userByMyReviewerId.localAttributes, registryConfig.pgRelations.pullRequestReview.userByMyReviewerId.remoteAttributes, $where, value);
      },
      reviewerId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("reviewerId", "reviewer_id", spec_pullRequestReview.attributes.reviewer_id, queryBuilder, value);
      },
      rowId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("rowId", "id", spec_pullRequestReview.attributes.id, queryBuilder, value);
      },
      state(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("state", "state", spec_pullRequestReview.attributes.state, queryBuilder, value);
      },
      submittedAt(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("submittedAt", "submitted_at", spec_pullRequestReview.attributes.submitted_at, queryBuilder, value);
      },
      updatedAt(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("updatedAt", "updated_at", spec_pullRequestReview.attributes.updated_at, queryBuilder, value);
      }
    }
  },
  PullRequestReviewHavingAverageInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_average, spec_pullRequestReview.attributes.created_at, "created_at", $having);
      },
      submittedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_average, spec_pullRequestReview.attributes.submitted_at, "submitted_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_average, spec_pullRequestReview.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  PullRequestReviewHavingDistinctCountInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_distinctCount, spec_pullRequestReview.attributes.created_at, "created_at", $having);
      },
      submittedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_distinctCount, spec_pullRequestReview.attributes.submitted_at, "submitted_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_distinctCount, spec_pullRequestReview.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  PullRequestReviewHavingInput: {
    plans: {
      AND: pgAggregatesApplyAnd,
      average: pgAggregatesPlanAggregatesField,
      distinctCount: pgAggregatesPlanAggregatesField,
      max: pgAggregatesPlanAggregatesField,
      min: pgAggregatesPlanAggregatesField,
      OR: RepositoryCollaboratorHavingInput_ORApply,
      stddevPopulation: pgAggregatesPlanAggregatesField,
      stddevSample: pgAggregatesPlanAggregatesField,
      sum: pgAggregatesPlanAggregatesField,
      variancePopulation: pgAggregatesPlanAggregatesField,
      varianceSample: pgAggregatesPlanAggregatesField
    }
  },
  PullRequestReviewHavingMaxInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_max, spec_pullRequestReview.attributes.created_at, "created_at", $having);
      },
      submittedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_max, spec_pullRequestReview.attributes.submitted_at, "submitted_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_max, spec_pullRequestReview.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  PullRequestReviewHavingMinInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_min, spec_pullRequestReview.attributes.created_at, "created_at", $having);
      },
      submittedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_min, spec_pullRequestReview.attributes.submitted_at, "submitted_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_min, spec_pullRequestReview.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  PullRequestReviewHavingStddevPopulationInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevPopulation, spec_pullRequestReview.attributes.created_at, "created_at", $having);
      },
      submittedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevPopulation, spec_pullRequestReview.attributes.submitted_at, "submitted_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevPopulation, spec_pullRequestReview.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  PullRequestReviewHavingStddevSampleInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevSample, spec_pullRequestReview.attributes.created_at, "created_at", $having);
      },
      submittedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevSample, spec_pullRequestReview.attributes.submitted_at, "submitted_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevSample, spec_pullRequestReview.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  PullRequestReviewHavingSumInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_sum, spec_pullRequestReview.attributes.created_at, "created_at", $having);
      },
      submittedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_sum, spec_pullRequestReview.attributes.submitted_at, "submitted_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_sum, spec_pullRequestReview.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  PullRequestReviewHavingVariancePopulationInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_variancePopulation, spec_pullRequestReview.attributes.created_at, "created_at", $having);
      },
      submittedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_variancePopulation, spec_pullRequestReview.attributes.submitted_at, "submitted_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_variancePopulation, spec_pullRequestReview.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  PullRequestReviewHavingVarianceSampleInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_varianceSample, spec_pullRequestReview.attributes.created_at, "created_at", $having);
      },
      submittedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_varianceSample, spec_pullRequestReview.attributes.submitted_at, "submitted_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_varianceSample, spec_pullRequestReview.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  PullRequestReviewInput: {
    baked: createObjectAndApplyChildren,
    plans: {
      body: PullRequestReviewInput_bodyApply,
      createdAt: RepositoryRelationshipMetadatumInput_createdAtApply,
      pullRequestId: PullRequestReviewInput_pullRequestIdApply,
      reviewerId: PullRequestReviewInput_reviewerIdApply,
      rowId: RepositoryRelationshipMetadatumInput_rowIdApply,
      state: PullRequestReviewInput_stateApply,
      submittedAt: PullRequestReviewInput_submittedAtApply,
      updatedAt: RepositoryCollaboratorInput_updatedAtApply
    }
  },
  PullRequestReviewPatch: {
    baked: createObjectAndApplyChildren,
    plans: {
      body: PullRequestReviewInput_bodyApply,
      createdAt: RepositoryRelationshipMetadatumInput_createdAtApply,
      pullRequestId: PullRequestReviewInput_pullRequestIdApply,
      reviewerId: PullRequestReviewInput_reviewerIdApply,
      rowId: RepositoryRelationshipMetadatumInput_rowIdApply,
      state: PullRequestReviewInput_stateApply,
      submittedAt: PullRequestReviewInput_submittedAtApply,
      updatedAt: RepositoryCollaboratorInput_updatedAtApply
    }
  },
  PullRequestStddevPopulationAggregateFilter: {
    plans: {
      number($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_stddevPopulation, "number", TYPES.numeric, TYPES.int, $parent, input);
      }
    }
  },
  PullRequestStddevSampleAggregateFilter: {
    plans: {
      number($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_stddevSample, "number", TYPES.numeric, TYPES.int, $parent, input);
      }
    }
  },
  PullRequestSumAggregateFilter: {
    plans: {
      number($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_sum, "number", TYPES.bigint, TYPES.int, $parent, input);
      }
    }
  },
  PullRequestToManyPullRequestCommentFilter: {
    plans: {
      aggregates: RepositoryToManyRepositoryCollaboratorFilter_aggregatesApply,
      every: RepositoryToManyRepositoryCollaboratorFilter_everyApply,
      none: RepositoryToManyRepositoryCollaboratorFilter_noneApply,
      some: RepositoryToManyRepositoryCollaboratorFilter_someApply
    }
  },
  PullRequestToManyPullRequestReviewFilter: {
    plans: {
      aggregates: RepositoryToManyRepositoryCollaboratorFilter_aggregatesApply,
      every: RepositoryToManyRepositoryCollaboratorFilter_everyApply,
      none: RepositoryToManyRepositoryCollaboratorFilter_noneApply,
      some: RepositoryToManyRepositoryCollaboratorFilter_someApply
    }
  },
  PullRequestVariancePopulationAggregateFilter: {
    plans: {
      number($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_variancePopulation, "number", TYPES.numeric, TYPES.int, $parent, input);
      }
    }
  },
  PullRequestVarianceSampleAggregateFilter: {
    plans: {
      number($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_varianceSample, "number", TYPES.numeric, TYPES.int, $parent, input);
      }
    }
  },
  RepositoryAggregatesFilter: {
    plans: {
      distinctCount: RepositoryAggregatesFilter_distinctCountApply,
      filter: filterApply
    }
  },
  RepositoryCollaboratorAggregatesFilter: {
    plans: {
      distinctCount: RepositoryAggregatesFilter_distinctCountApply,
      filter: filterApply
    }
  },
  RepositoryCollaboratorCondition: {
    plans: {
      createdAt: RepositoryCondition_createdAtApply,
      permission($condition, val) {
        return applyAttributeCondition("permission", permissionCodec, $condition, val);
      },
      repositoryId: RepositoryCollaboratorCondition_repositoryIdApply,
      updatedAt: RepositoryCondition_updatedAtApply,
      userId($condition, val) {
        return applyAttributeCondition("user_id", TYPES.uuid, $condition, val);
      }
    }
  },
  RepositoryCollaboratorDistinctCountAggregateFilter: {
    plans: {
      createdAt: RepositoryDistinctCountAggregateFilter_createdAtApply,
      permission($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "permission", TYPES.bigint, permissionCodec, $parent, input);
      },
      repositoryId: RepositoryCollaboratorDistinctCountAggregateFilter_repositoryIdApply,
      updatedAt: RepositoryDistinctCountAggregateFilter_updatedAtApply,
      userId($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "user_id", TYPES.bigint, TYPES.uuid, $parent, input);
      }
    }
  },
  RepositoryCollaboratorFilter: {
    plans: {
      and: RepositoryFilter_andApply,
      createdAt(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("createdAt", "created_at", spec_repositoryCollaborator.attributes.created_at, queryBuilder, value);
      },
      not: RepositoryFilter_notApply,
      or: RepositoryFilter_orApply,
      permission(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("permission", "permission", spec_repositoryCollaborator.attributes.permission, queryBuilder, value);
      },
      repository($where, value) {
        return pgConnectionFilterApplySingleRelation(spec_resource_repositoryPgResource, repositoryIdentifier, registryConfig.pgRelations.repositoryCollaborator.repositoryByMyRepositoryId.localAttributes, registryConfig.pgRelations.repositoryCollaborator.repositoryByMyRepositoryId.remoteAttributes, $where, value);
      },
      repositoryId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("repositoryId", "repository_id", spec_repositoryCollaborator.attributes.repository_id, queryBuilder, value);
      },
      updatedAt(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("updatedAt", "updated_at", spec_repositoryCollaborator.attributes.updated_at, queryBuilder, value);
      },
      user($where, value) {
        return pgConnectionFilterApplySingleRelation(spec_resource_userPgResource, userIdentifier, registryConfig.pgRelations.repositoryCollaborator.userByMyUserId.localAttributes, registryConfig.pgRelations.repositoryCollaborator.userByMyUserId.remoteAttributes, $where, value);
      },
      userId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("userId", "user_id", spec_repositoryCollaborator.attributes.user_id, queryBuilder, value);
      }
    }
  },
  RepositoryCollaboratorHavingAverageInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_average, spec_repositoryCollaborator.attributes.created_at, "created_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_average, spec_repositoryCollaborator.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  RepositoryCollaboratorHavingDistinctCountInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_distinctCount, spec_repositoryCollaborator.attributes.created_at, "created_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_distinctCount, spec_repositoryCollaborator.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  RepositoryCollaboratorHavingInput: {
    plans: {
      AND: pgAggregatesApplyAnd,
      average: pgAggregatesPlanAggregatesField,
      distinctCount: pgAggregatesPlanAggregatesField,
      max: pgAggregatesPlanAggregatesField,
      min: pgAggregatesPlanAggregatesField,
      OR: RepositoryCollaboratorHavingInput_ORApply,
      stddevPopulation: pgAggregatesPlanAggregatesField,
      stddevSample: pgAggregatesPlanAggregatesField,
      sum: pgAggregatesPlanAggregatesField,
      variancePopulation: pgAggregatesPlanAggregatesField,
      varianceSample: pgAggregatesPlanAggregatesField
    }
  },
  RepositoryCollaboratorHavingMaxInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_max, spec_repositoryCollaborator.attributes.created_at, "created_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_max, spec_repositoryCollaborator.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  RepositoryCollaboratorHavingMinInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_min, spec_repositoryCollaborator.attributes.created_at, "created_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_min, spec_repositoryCollaborator.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  RepositoryCollaboratorHavingStddevPopulationInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevPopulation, spec_repositoryCollaborator.attributes.created_at, "created_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevPopulation, spec_repositoryCollaborator.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  RepositoryCollaboratorHavingStddevSampleInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevSample, spec_repositoryCollaborator.attributes.created_at, "created_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevSample, spec_repositoryCollaborator.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  RepositoryCollaboratorHavingSumInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_sum, spec_repositoryCollaborator.attributes.created_at, "created_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_sum, spec_repositoryCollaborator.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  RepositoryCollaboratorHavingVariancePopulationInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_variancePopulation, spec_repositoryCollaborator.attributes.created_at, "created_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_variancePopulation, spec_repositoryCollaborator.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  RepositoryCollaboratorHavingVarianceSampleInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_varianceSample, spec_repositoryCollaborator.attributes.created_at, "created_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_varianceSample, spec_repositoryCollaborator.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  RepositoryCollaboratorInput: {
    baked: createObjectAndApplyChildren,
    plans: {
      createdAt: RepositoryRelationshipMetadatumInput_createdAtApply,
      permission: RepositoryCollaboratorInput_permissionApply,
      repositoryId: ExternalDependencyInput_repositoryIdApply,
      updatedAt: RepositoryCollaboratorInput_updatedAtApply,
      userId: RepositoryCollaboratorInput_userIdApply
    }
  },
  RepositoryCollaboratorPatch: {
    baked: createObjectAndApplyChildren,
    plans: {
      createdAt: RepositoryRelationshipMetadatumInput_createdAtApply,
      permission: RepositoryCollaboratorInput_permissionApply,
      repositoryId: ExternalDependencyInput_repositoryIdApply,
      updatedAt: RepositoryCollaboratorInput_updatedAtApply,
      userId: RepositoryCollaboratorInput_userIdApply
    }
  },
  RepositoryCondition: {
    plans: {
      createdAt: RepositoryCondition_createdAtApply,
      defaultBranch($condition, val) {
        return applyAttributeCondition("default_branch", TYPES.text, $condition, val);
      },
      description: RepositoryCondition_descriptionApply,
      name: RepositoryCondition_nameApply,
      organizationId: RepositoryCondition_organizationIdApply,
      ownerId($condition, val) {
        return applyAttributeCondition("owner_id", TYPES.uuid, $condition, val);
      },
      rowId: RepositoryCondition_rowIdApply,
      slug($condition, val) {
        return applyAttributeCondition("slug", TYPES.text, $condition, val);
      },
      updatedAt: RepositoryCondition_updatedAtApply,
      visibility($condition, val) {
        return applyAttributeCondition("visibility", visibilityCodec, $condition, val);
      }
    }
  },
  RepositoryDistinctCountAggregateFilter: {
    plans: {
      createdAt: RepositoryDistinctCountAggregateFilter_createdAtApply,
      defaultBranch($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "default_branch", TYPES.bigint, TYPES.text, $parent, input);
      },
      description: RepositoryDistinctCountAggregateFilter_descriptionApply,
      name: RepositoryDistinctCountAggregateFilter_nameApply,
      organizationId: RepositoryDistinctCountAggregateFilter_organizationIdApply,
      ownerId($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "owner_id", TYPES.bigint, TYPES.uuid, $parent, input);
      },
      rowId: RepositoryDistinctCountAggregateFilter_rowIdApply,
      slug($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "slug", TYPES.bigint, TYPES.text, $parent, input);
      },
      updatedAt: RepositoryDistinctCountAggregateFilter_updatedAtApply,
      visibility($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "visibility", TYPES.bigint, visibilityCodec, $parent, input);
      }
    }
  },
  RepositoryFilter: {
    plans: {
      and: RepositoryFilter_andApply,
      createdAt(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("createdAt", "created_at", spec_repository.attributes.created_at, queryBuilder, value);
      },
      defaultBranch(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("defaultBranch", "default_branch", spec_repository.attributes.default_branch, queryBuilder, value);
      },
      description(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("description", "description", spec_repository.attributes.description, queryBuilder, value);
      },
      externalDependencies($where, value) {
        assertAllowed(value, "object");
        const $rel = $where.andPlan();
        $rel.extensions.pgFilterRelation = {
          tableExpression: externalDependencyIdentifier,
          alias: spec_resource_external_dependencyPgResource.name,
          localAttributes: registryConfig.pgRelations.repository.externalDependenciesByTheirRepositoryId.localAttributes,
          remoteAttributes: registryConfig.pgRelations.repository.externalDependenciesByTheirRepositoryId.remoteAttributes
        };
        return $rel;
      },
      externalDependenciesExist($where, value) {
        assertAllowed(value, "scalar");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: externalDependencyIdentifier,
          alias: spec_resource_external_dependencyPgResource.name,
          equals: value
        });
        registryConfig.pgRelations.repository.externalDependenciesByTheirRepositoryId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.repository.externalDependenciesByTheirRepositoryId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
      },
      name(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("name", "name", spec_repository.attributes.name, queryBuilder, value);
      },
      not: RepositoryFilter_notApply,
      or: RepositoryFilter_orApply,
      organization($where, value) {
        return pgConnectionFilterApplySingleRelation(spec_resource_organizationPgResource, organizationIdentifier, registryConfig.pgRelations.repository.organizationByMyOrganizationId.localAttributes, registryConfig.pgRelations.repository.organizationByMyOrganizationId.remoteAttributes, $where, value);
      },
      organizationExists($where, value) {
        return pgConnectionFilterApplyForwardRelationExists(spec_resource_organizationPgResource, organizationIdentifier, registryConfig.pgRelations.repository.organizationByMyOrganizationId.localAttributes, registryConfig.pgRelations.repository.organizationByMyOrganizationId.remoteAttributes, $where, value);
      },
      organizationId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("organizationId", "organization_id", spec_repository.attributes.organization_id, queryBuilder, value);
      },
      owner($where, value) {
        return pgConnectionFilterApplySingleRelation(spec_resource_userPgResource, userIdentifier, registryConfig.pgRelations.repository.userByMyOwnerId.localAttributes, registryConfig.pgRelations.repository.userByMyOwnerId.remoteAttributes, $where, value);
      },
      ownerId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("ownerId", "owner_id", spec_repository.attributes.owner_id, queryBuilder, value);
      },
      pullRequests($where, value) {
        assertAllowed(value, "object");
        const $rel = $where.andPlan();
        $rel.extensions.pgFilterRelation = {
          tableExpression: pullRequestIdentifier,
          alias: spec_resource_pull_requestPgResource.name,
          localAttributes: registryConfig.pgRelations.repository.pullRequestsByTheirRepositoryId.localAttributes,
          remoteAttributes: registryConfig.pgRelations.repository.pullRequestsByTheirRepositoryId.remoteAttributes
        };
        return $rel;
      },
      pullRequestsExist($where, value) {
        assertAllowed(value, "scalar");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: pullRequestIdentifier,
          alias: spec_resource_pull_requestPgResource.name,
          equals: value
        });
        registryConfig.pgRelations.repository.pullRequestsByTheirRepositoryId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.repository.pullRequestsByTheirRepositoryId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
      },
      repositoryCollaborators($where, value) {
        assertAllowed(value, "object");
        const $rel = $where.andPlan();
        $rel.extensions.pgFilterRelation = {
          tableExpression: repositoryCollaboratorIdentifier,
          alias: spec_resource_repository_collaboratorPgResource.name,
          localAttributes: registryConfig.pgRelations.repository.repositoryCollaboratorsByTheirRepositoryId.localAttributes,
          remoteAttributes: registryConfig.pgRelations.repository.repositoryCollaboratorsByTheirRepositoryId.remoteAttributes
        };
        return $rel;
      },
      repositoryCollaboratorsExist($where, value) {
        assertAllowed(value, "scalar");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: repositoryCollaboratorIdentifier,
          alias: spec_resource_repository_collaboratorPgResource.name,
          equals: value
        });
        registryConfig.pgRelations.repository.repositoryCollaboratorsByTheirRepositoryId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.repository.repositoryCollaboratorsByTheirRepositoryId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
      },
      repositoryRelationshipsBySourceRepositoryId($where, value) {
        assertAllowed(value, "object");
        const $rel = $where.andPlan();
        $rel.extensions.pgFilterRelation = {
          tableExpression: repositoryRelationshipIdentifier,
          alias: spec_resource_repository_relationshipPgResource.name,
          localAttributes: registryConfig.pgRelations.repository.repositoryRelationshipsByTheirSourceRepositoryId.localAttributes,
          remoteAttributes: registryConfig.pgRelations.repository.repositoryRelationshipsByTheirSourceRepositoryId.remoteAttributes
        };
        return $rel;
      },
      repositoryRelationshipsBySourceRepositoryIdExist($where, value) {
        assertAllowed(value, "scalar");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: repositoryRelationshipIdentifier,
          alias: spec_resource_repository_relationshipPgResource.name,
          equals: value
        });
        registryConfig.pgRelations.repository.repositoryRelationshipsByTheirSourceRepositoryId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.repository.repositoryRelationshipsByTheirSourceRepositoryId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
      },
      repositoryRelationshipsByTargetRepositoryId($where, value) {
        assertAllowed(value, "object");
        const $rel = $where.andPlan();
        $rel.extensions.pgFilterRelation = {
          tableExpression: repositoryRelationshipIdentifier,
          alias: spec_resource_repository_relationshipPgResource.name,
          localAttributes: registryConfig.pgRelations.repository.repositoryRelationshipsByTheirTargetRepositoryId.localAttributes,
          remoteAttributes: registryConfig.pgRelations.repository.repositoryRelationshipsByTheirTargetRepositoryId.remoteAttributes
        };
        return $rel;
      },
      repositoryRelationshipsByTargetRepositoryIdExist($where, value) {
        assertAllowed(value, "scalar");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: repositoryRelationshipIdentifier,
          alias: spec_resource_repository_relationshipPgResource.name,
          equals: value
        });
        registryConfig.pgRelations.repository.repositoryRelationshipsByTheirTargetRepositoryId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.repository.repositoryRelationshipsByTheirTargetRepositoryId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
      },
      rowId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("rowId", "id", spec_repository.attributes.id, queryBuilder, value);
      },
      slug(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("slug", "slug", spec_repository.attributes.slug, queryBuilder, value);
      },
      updatedAt(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("updatedAt", "updated_at", spec_repository.attributes.updated_at, queryBuilder, value);
      },
      visibility(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("visibility", "visibility", spec_repository.attributes.visibility, queryBuilder, value);
      }
    }
  },
  RepositoryHavingAverageInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_average, spec_repository.attributes.created_at, "created_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_average, spec_repository.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  RepositoryHavingDistinctCountInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_distinctCount, spec_repository.attributes.created_at, "created_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_distinctCount, spec_repository.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  RepositoryHavingInput: {
    plans: {
      AND: pgAggregatesApplyAnd,
      average: pgAggregatesPlanAggregatesField,
      distinctCount: pgAggregatesPlanAggregatesField,
      max: pgAggregatesPlanAggregatesField,
      min: pgAggregatesPlanAggregatesField,
      OR: RepositoryCollaboratorHavingInput_ORApply,
      stddevPopulation: pgAggregatesPlanAggregatesField,
      stddevSample: pgAggregatesPlanAggregatesField,
      sum: pgAggregatesPlanAggregatesField,
      variancePopulation: pgAggregatesPlanAggregatesField,
      varianceSample: pgAggregatesPlanAggregatesField
    }
  },
  RepositoryHavingMaxInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_max, spec_repository.attributes.created_at, "created_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_max, spec_repository.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  RepositoryHavingMinInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_min, spec_repository.attributes.created_at, "created_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_min, spec_repository.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  RepositoryHavingStddevPopulationInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevPopulation, spec_repository.attributes.created_at, "created_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevPopulation, spec_repository.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  RepositoryHavingStddevSampleInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevSample, spec_repository.attributes.created_at, "created_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevSample, spec_repository.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  RepositoryHavingSumInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_sum, spec_repository.attributes.created_at, "created_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_sum, spec_repository.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  RepositoryHavingVariancePopulationInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_variancePopulation, spec_repository.attributes.created_at, "created_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_variancePopulation, spec_repository.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  RepositoryHavingVarianceSampleInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_varianceSample, spec_repository.attributes.created_at, "created_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_varianceSample, spec_repository.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  RepositoryInput: {
    baked: createObjectAndApplyChildren,
    plans: {
      createdAt: RepositoryRelationshipMetadatumInput_createdAtApply,
      defaultBranch: RepositoryInput_defaultBranchApply,
      description: RepositoryRelationshipTypeInput_descriptionApply,
      name: RepositoryRelationshipTypeInput_nameApply,
      organizationId: RepositoryRelationshipTypeInput_organizationIdApply,
      ownerId: RepositoryInput_ownerIdApply,
      rowId: RepositoryRelationshipMetadatumInput_rowIdApply,
      slug: RepositoryInput_slugApply,
      updatedAt: RepositoryCollaboratorInput_updatedAtApply,
      visibility: RepositoryInput_visibilityApply
    }
  },
  RepositoryPatch: {
    baked: createObjectAndApplyChildren,
    plans: {
      createdAt: RepositoryRelationshipMetadatumInput_createdAtApply,
      defaultBranch: RepositoryInput_defaultBranchApply,
      description: RepositoryRelationshipTypeInput_descriptionApply,
      name: RepositoryRelationshipTypeInput_nameApply,
      organizationId: RepositoryRelationshipTypeInput_organizationIdApply,
      ownerId: RepositoryInput_ownerIdApply,
      rowId: RepositoryRelationshipMetadatumInput_rowIdApply,
      slug: RepositoryInput_slugApply,
      updatedAt: RepositoryCollaboratorInput_updatedAtApply,
      visibility: RepositoryInput_visibilityApply
    }
  },
  RepositoryRelationshipAggregatesFilter: {
    plans: {
      average: PullRequestCommentAggregatesFilter_averageApply,
      distinctCount: RepositoryAggregatesFilter_distinctCountApply,
      filter: filterApply,
      max: PullRequestCommentAggregatesFilter_maxApply,
      min: PullRequestCommentAggregatesFilter_minApply,
      stddevPopulation: PullRequestCommentAggregatesFilter_stddevPopulationApply,
      stddevSample: PullRequestCommentAggregatesFilter_stddevSampleApply,
      sum: PullRequestCommentAggregatesFilter_sumApply,
      variancePopulation: PullRequestCommentAggregatesFilter_variancePopulationApply,
      varianceSample: PullRequestCommentAggregatesFilter_varianceSampleApply
    }
  },
  RepositoryRelationshipAverageAggregateFilter: {
    plans: {
      confidence($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_average, "confidence", TYPES.float, TYPES.float4, $parent, input);
      }
    }
  },
  RepositoryRelationshipCondition: {
    plans: {
      branch($condition, val) {
        return applyAttributeCondition("branch", TYPES.text, $condition, val);
      },
      confidence($condition, val) {
        return applyAttributeCondition("confidence", TYPES.float4, $condition, val);
      },
      createdAt: RepositoryCondition_createdAtApply,
      detectionSource: ExternalDependencyCondition_detectionSourceApply,
      relationshipTypeId($condition, val) {
        return applyAttributeCondition("relationship_type_id", TYPES.uuid, $condition, val);
      },
      rowId: RepositoryCondition_rowIdApply,
      sourceRepositoryId($condition, val) {
        return applyAttributeCondition("source_repository_id", TYPES.uuid, $condition, val);
      },
      targetRepositoryId($condition, val) {
        return applyAttributeCondition("target_repository_id", TYPES.uuid, $condition, val);
      },
      updatedAt: RepositoryCondition_updatedAtApply,
      versionConstraint: ExternalDependencyCondition_versionConstraintApply
    }
  },
  RepositoryRelationshipDistinctCountAggregateFilter: {
    plans: {
      branch($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "branch", TYPES.bigint, TYPES.text, $parent, input);
      },
      confidence($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "confidence", TYPES.bigint, TYPES.float4, $parent, input);
      },
      createdAt: RepositoryDistinctCountAggregateFilter_createdAtApply,
      detectionSource: ExternalDependencyDistinctCountAggregateFilter_detectionSourceApply,
      relationshipTypeId($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "relationship_type_id", TYPES.bigint, TYPES.uuid, $parent, input);
      },
      rowId: RepositoryDistinctCountAggregateFilter_rowIdApply,
      sourceRepositoryId($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "source_repository_id", TYPES.bigint, TYPES.uuid, $parent, input);
      },
      targetRepositoryId($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "target_repository_id", TYPES.bigint, TYPES.uuid, $parent, input);
      },
      updatedAt: RepositoryDistinctCountAggregateFilter_updatedAtApply,
      versionConstraint: ExternalDependencyDistinctCountAggregateFilter_versionConstraintApply
    }
  },
  RepositoryRelationshipFilter: {
    plans: {
      and: RepositoryFilter_andApply,
      branch(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("branch", "branch", spec_repositoryRelationship.attributes.branch, queryBuilder, value);
      },
      confidence(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("confidence", "confidence", spec_repositoryRelationship.attributes.confidence, queryBuilder, value);
      },
      createdAt(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("createdAt", "created_at", spec_repositoryRelationship.attributes.created_at, queryBuilder, value);
      },
      detectionSource(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("detectionSource", "detection_source", spec_repositoryRelationship.attributes.detection_source, queryBuilder, value);
      },
      not: RepositoryFilter_notApply,
      or: RepositoryFilter_orApply,
      relationshipType($where, value) {
        return pgConnectionFilterApplySingleRelation(spec_resource_repository_relationship_typePgResource, repositoryRelationshipTypeIdentifier, registryConfig.pgRelations.repositoryRelationship.repositoryRelationshipTypeByMyRelationshipTypeId.localAttributes, registryConfig.pgRelations.repositoryRelationship.repositoryRelationshipTypeByMyRelationshipTypeId.remoteAttributes, $where, value);
      },
      relationshipTypeId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("relationshipTypeId", "relationship_type_id", spec_repositoryRelationship.attributes.relationship_type_id, queryBuilder, value);
      },
      repositoryRelationshipMetadataByRelationshipId($where, value) {
        assertAllowed(value, "object");
        const $rel = $where.andPlan();
        $rel.extensions.pgFilterRelation = {
          tableExpression: repositoryRelationshipMetadataIdentifier,
          alias: spec_resource_repository_relationship_metadataPgResource.name,
          localAttributes: registryConfig.pgRelations.repositoryRelationship.repositoryRelationshipMetadataByTheirRelationshipId.localAttributes,
          remoteAttributes: registryConfig.pgRelations.repositoryRelationship.repositoryRelationshipMetadataByTheirRelationshipId.remoteAttributes
        };
        return $rel;
      },
      repositoryRelationshipMetadataByRelationshipIdExist($where, value) {
        assertAllowed(value, "scalar");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: repositoryRelationshipMetadataIdentifier,
          alias: spec_resource_repository_relationship_metadataPgResource.name,
          equals: value
        });
        registryConfig.pgRelations.repositoryRelationship.repositoryRelationshipMetadataByTheirRelationshipId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.repositoryRelationship.repositoryRelationshipMetadataByTheirRelationshipId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
      },
      rowId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("rowId", "id", spec_repositoryRelationship.attributes.id, queryBuilder, value);
      },
      sourceRepository($where, value) {
        return pgConnectionFilterApplySingleRelation(spec_resource_repositoryPgResource, repositoryIdentifier, registryConfig.pgRelations.repositoryRelationship.repositoryByMySourceRepositoryId.localAttributes, registryConfig.pgRelations.repositoryRelationship.repositoryByMySourceRepositoryId.remoteAttributes, $where, value);
      },
      sourceRepositoryId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("sourceRepositoryId", "source_repository_id", spec_repositoryRelationship.attributes.source_repository_id, queryBuilder, value);
      },
      targetRepository($where, value) {
        return pgConnectionFilterApplySingleRelation(spec_resource_repositoryPgResource, repositoryIdentifier, registryConfig.pgRelations.repositoryRelationship.repositoryByMyTargetRepositoryId.localAttributes, registryConfig.pgRelations.repositoryRelationship.repositoryByMyTargetRepositoryId.remoteAttributes, $where, value);
      },
      targetRepositoryId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("targetRepositoryId", "target_repository_id", spec_repositoryRelationship.attributes.target_repository_id, queryBuilder, value);
      },
      updatedAt(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("updatedAt", "updated_at", spec_repositoryRelationship.attributes.updated_at, queryBuilder, value);
      },
      versionConstraint(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("versionConstraint", "version_constraint", spec_repositoryRelationship.attributes.version_constraint, queryBuilder, value);
      }
    }
  },
  RepositoryRelationshipHavingAverageInput: {
    plans: {
      confidence($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_average, spec_repositoryRelationship.attributes.confidence, "confidence", $having);
      },
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_average, spec_repositoryRelationship.attributes.created_at, "created_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_average, spec_repositoryRelationship.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  RepositoryRelationshipHavingDistinctCountInput: {
    plans: {
      confidence($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.confidence, "confidence", $having);
      },
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.created_at, "created_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  RepositoryRelationshipHavingInput: {
    plans: {
      AND: pgAggregatesApplyAnd,
      average: pgAggregatesPlanAggregatesField,
      distinctCount: pgAggregatesPlanAggregatesField,
      max: pgAggregatesPlanAggregatesField,
      min: pgAggregatesPlanAggregatesField,
      OR: RepositoryCollaboratorHavingInput_ORApply,
      stddevPopulation: pgAggregatesPlanAggregatesField,
      stddevSample: pgAggregatesPlanAggregatesField,
      sum: pgAggregatesPlanAggregatesField,
      variancePopulation: pgAggregatesPlanAggregatesField,
      varianceSample: pgAggregatesPlanAggregatesField
    }
  },
  RepositoryRelationshipHavingMaxInput: {
    plans: {
      confidence($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_max, spec_repositoryRelationship.attributes.confidence, "confidence", $having);
      },
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_max, spec_repositoryRelationship.attributes.created_at, "created_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_max, spec_repositoryRelationship.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  RepositoryRelationshipHavingMinInput: {
    plans: {
      confidence($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_min, spec_repositoryRelationship.attributes.confidence, "confidence", $having);
      },
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_min, spec_repositoryRelationship.attributes.created_at, "created_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_min, spec_repositoryRelationship.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  RepositoryRelationshipHavingStddevPopulationInput: {
    plans: {
      confidence($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevPopulation, spec_repositoryRelationship.attributes.confidence, "confidence", $having);
      },
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevPopulation, spec_repositoryRelationship.attributes.created_at, "created_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevPopulation, spec_repositoryRelationship.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  RepositoryRelationshipHavingStddevSampleInput: {
    plans: {
      confidence($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevSample, spec_repositoryRelationship.attributes.confidence, "confidence", $having);
      },
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevSample, spec_repositoryRelationship.attributes.created_at, "created_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevSample, spec_repositoryRelationship.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  RepositoryRelationshipHavingSumInput: {
    plans: {
      confidence($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_sum, spec_repositoryRelationship.attributes.confidence, "confidence", $having);
      },
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_sum, spec_repositoryRelationship.attributes.created_at, "created_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_sum, spec_repositoryRelationship.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  RepositoryRelationshipHavingVariancePopulationInput: {
    plans: {
      confidence($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_variancePopulation, spec_repositoryRelationship.attributes.confidence, "confidence", $having);
      },
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_variancePopulation, spec_repositoryRelationship.attributes.created_at, "created_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_variancePopulation, spec_repositoryRelationship.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  RepositoryRelationshipHavingVarianceSampleInput: {
    plans: {
      confidence($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_varianceSample, spec_repositoryRelationship.attributes.confidence, "confidence", $having);
      },
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_varianceSample, spec_repositoryRelationship.attributes.created_at, "created_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_varianceSample, spec_repositoryRelationship.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  RepositoryRelationshipInput: {
    baked: createObjectAndApplyChildren,
    plans: {
      branch: RepositoryRelationshipInput_branchApply,
      confidence: RepositoryRelationshipInput_confidenceApply,
      createdAt: RepositoryRelationshipMetadatumInput_createdAtApply,
      detectionSource: ExternalDependencyInput_detectionSourceApply,
      relationshipTypeId: RepositoryRelationshipInput_relationshipTypeIdApply,
      rowId: RepositoryRelationshipMetadatumInput_rowIdApply,
      sourceRepositoryId: RepositoryRelationshipInput_sourceRepositoryIdApply,
      targetRepositoryId: RepositoryRelationshipInput_targetRepositoryIdApply,
      updatedAt: RepositoryCollaboratorInput_updatedAtApply,
      versionConstraint: ExternalDependencyInput_versionConstraintApply
    }
  },
  RepositoryRelationshipMaxAggregateFilter: {
    plans: {
      confidence($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_max, "confidence", TYPES.float4, TYPES.float4, $parent, input);
      }
    }
  },
  RepositoryRelationshipMetadatumAggregatesFilter: {
    plans: {
      distinctCount: RepositoryAggregatesFilter_distinctCountApply,
      filter: filterApply
    }
  },
  RepositoryRelationshipMetadatumCondition: {
    plans: {
      createdAt: RepositoryCondition_createdAtApply,
      key($condition, val) {
        return applyAttributeCondition("key", TYPES.text, $condition, val);
      },
      relationshipId($condition, val) {
        return applyAttributeCondition("relationship_id", TYPES.uuid, $condition, val);
      },
      rowId: RepositoryCondition_rowIdApply,
      value($condition, val) {
        return applyAttributeCondition("value", TYPES.text, $condition, val);
      }
    }
  },
  RepositoryRelationshipMetadatumDistinctCountAggregateFilter: {
    plans: {
      createdAt: RepositoryDistinctCountAggregateFilter_createdAtApply,
      key($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "key", TYPES.bigint, TYPES.text, $parent, input);
      },
      relationshipId($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "relationship_id", TYPES.bigint, TYPES.uuid, $parent, input);
      },
      rowId: RepositoryDistinctCountAggregateFilter_rowIdApply,
      value($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "value", TYPES.bigint, TYPES.text, $parent, input);
      }
    }
  },
  RepositoryRelationshipMetadatumFilter: {
    plans: {
      and: RepositoryFilter_andApply,
      createdAt(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("createdAt", "created_at", spec_repositoryRelationshipMetadata.attributes.created_at, queryBuilder, value);
      },
      key(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("key", "key", spec_repositoryRelationshipMetadata.attributes.key, queryBuilder, value);
      },
      not: RepositoryFilter_notApply,
      or: RepositoryFilter_orApply,
      relationship($where, value) {
        return pgConnectionFilterApplySingleRelation(spec_resource_repository_relationshipPgResource, repositoryRelationshipIdentifier, registryConfig.pgRelations.repositoryRelationshipMetadata.repositoryRelationshipByMyRelationshipId.localAttributes, registryConfig.pgRelations.repositoryRelationshipMetadata.repositoryRelationshipByMyRelationshipId.remoteAttributes, $where, value);
      },
      relationshipId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("relationshipId", "relationship_id", spec_repositoryRelationshipMetadata.attributes.relationship_id, queryBuilder, value);
      },
      rowId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("rowId", "id", spec_repositoryRelationshipMetadata.attributes.id, queryBuilder, value);
      },
      value(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("value", "value", spec_repositoryRelationshipMetadata.attributes.value, queryBuilder, value);
      }
    }
  },
  RepositoryRelationshipMetadatumHavingAverageInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_average, spec_repositoryRelationshipMetadata.attributes.created_at, "created_at", $having);
      }
    }
  },
  RepositoryRelationshipMetadatumHavingDistinctCountInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_distinctCount, spec_repositoryRelationshipMetadata.attributes.created_at, "created_at", $having);
      }
    }
  },
  RepositoryRelationshipMetadatumHavingInput: {
    plans: {
      AND: pgAggregatesApplyAnd,
      average: pgAggregatesPlanAggregatesField,
      distinctCount: pgAggregatesPlanAggregatesField,
      max: pgAggregatesPlanAggregatesField,
      min: pgAggregatesPlanAggregatesField,
      OR: RepositoryCollaboratorHavingInput_ORApply,
      stddevPopulation: pgAggregatesPlanAggregatesField,
      stddevSample: pgAggregatesPlanAggregatesField,
      sum: pgAggregatesPlanAggregatesField,
      variancePopulation: pgAggregatesPlanAggregatesField,
      varianceSample: pgAggregatesPlanAggregatesField
    }
  },
  RepositoryRelationshipMetadatumHavingMaxInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_max, spec_repositoryRelationshipMetadata.attributes.created_at, "created_at", $having);
      }
    }
  },
  RepositoryRelationshipMetadatumHavingMinInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_min, spec_repositoryRelationshipMetadata.attributes.created_at, "created_at", $having);
      }
    }
  },
  RepositoryRelationshipMetadatumHavingStddevPopulationInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevPopulation, spec_repositoryRelationshipMetadata.attributes.created_at, "created_at", $having);
      }
    }
  },
  RepositoryRelationshipMetadatumHavingStddevSampleInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevSample, spec_repositoryRelationshipMetadata.attributes.created_at, "created_at", $having);
      }
    }
  },
  RepositoryRelationshipMetadatumHavingSumInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_sum, spec_repositoryRelationshipMetadata.attributes.created_at, "created_at", $having);
      }
    }
  },
  RepositoryRelationshipMetadatumHavingVariancePopulationInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_variancePopulation, spec_repositoryRelationshipMetadata.attributes.created_at, "created_at", $having);
      }
    }
  },
  RepositoryRelationshipMetadatumHavingVarianceSampleInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_varianceSample, spec_repositoryRelationshipMetadata.attributes.created_at, "created_at", $having);
      }
    }
  },
  RepositoryRelationshipMetadatumInput: {
    baked: createObjectAndApplyChildren,
    plans: {
      createdAt: RepositoryRelationshipMetadatumInput_createdAtApply,
      key: RepositoryRelationshipMetadatumInput_keyApply,
      relationshipId: RepositoryRelationshipMetadatumInput_relationshipIdApply,
      rowId: RepositoryRelationshipMetadatumInput_rowIdApply,
      value: RepositoryRelationshipMetadatumInput_valueApply
    }
  },
  RepositoryRelationshipMetadatumPatch: {
    baked: createObjectAndApplyChildren,
    plans: {
      createdAt: RepositoryRelationshipMetadatumInput_createdAtApply,
      key: RepositoryRelationshipMetadatumInput_keyApply,
      relationshipId: RepositoryRelationshipMetadatumInput_relationshipIdApply,
      rowId: RepositoryRelationshipMetadatumInput_rowIdApply,
      value: RepositoryRelationshipMetadatumInput_valueApply
    }
  },
  RepositoryRelationshipMinAggregateFilter: {
    plans: {
      confidence($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_min, "confidence", TYPES.float4, TYPES.float4, $parent, input);
      }
    }
  },
  RepositoryRelationshipPatch: {
    baked: createObjectAndApplyChildren,
    plans: {
      branch: RepositoryRelationshipInput_branchApply,
      confidence: RepositoryRelationshipInput_confidenceApply,
      createdAt: RepositoryRelationshipMetadatumInput_createdAtApply,
      detectionSource: ExternalDependencyInput_detectionSourceApply,
      relationshipTypeId: RepositoryRelationshipInput_relationshipTypeIdApply,
      rowId: RepositoryRelationshipMetadatumInput_rowIdApply,
      sourceRepositoryId: RepositoryRelationshipInput_sourceRepositoryIdApply,
      targetRepositoryId: RepositoryRelationshipInput_targetRepositoryIdApply,
      updatedAt: RepositoryCollaboratorInput_updatedAtApply,
      versionConstraint: ExternalDependencyInput_versionConstraintApply
    }
  },
  RepositoryRelationshipStddevPopulationAggregateFilter: {
    plans: {
      confidence($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_stddevPopulation, "confidence", TYPES.float, TYPES.float4, $parent, input);
      }
    }
  },
  RepositoryRelationshipStddevSampleAggregateFilter: {
    plans: {
      confidence($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_stddevSample, "confidence", TYPES.float, TYPES.float4, $parent, input);
      }
    }
  },
  RepositoryRelationshipSumAggregateFilter: {
    plans: {
      confidence($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_sum, "confidence", TYPES.float4, TYPES.float4, $parent, input);
      }
    }
  },
  RepositoryRelationshipToManyRepositoryRelationshipMetadatumFilter: {
    plans: {
      aggregates: RepositoryToManyRepositoryCollaboratorFilter_aggregatesApply,
      every: RepositoryToManyRepositoryCollaboratorFilter_everyApply,
      none: RepositoryToManyRepositoryCollaboratorFilter_noneApply,
      some: RepositoryToManyRepositoryCollaboratorFilter_someApply
    }
  },
  RepositoryRelationshipTypeAggregatesFilter: {
    plans: {
      distinctCount: RepositoryAggregatesFilter_distinctCountApply,
      filter: filterApply
    }
  },
  RepositoryRelationshipTypeCondition: {
    plans: {
      createdAt: RepositoryCondition_createdAtApply,
      description: RepositoryCondition_descriptionApply,
      isDirected($condition, val) {
        return applyAttributeCondition("is_directed", TYPES.boolean, $condition, val);
      },
      name: RepositoryCondition_nameApply,
      organizationId: RepositoryCondition_organizationIdApply,
      rowId: RepositoryCondition_rowIdApply
    }
  },
  RepositoryRelationshipTypeDistinctCountAggregateFilter: {
    plans: {
      createdAt: RepositoryDistinctCountAggregateFilter_createdAtApply,
      description: RepositoryDistinctCountAggregateFilter_descriptionApply,
      isDirected($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_distinctCount, "is_directed", TYPES.bigint, TYPES.boolean, $parent, input);
      },
      name: RepositoryDistinctCountAggregateFilter_nameApply,
      organizationId: RepositoryDistinctCountAggregateFilter_organizationIdApply,
      rowId: RepositoryDistinctCountAggregateFilter_rowIdApply
    }
  },
  RepositoryRelationshipTypeFilter: {
    plans: {
      and: RepositoryFilter_andApply,
      createdAt(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("createdAt", "created_at", spec_repositoryRelationshipType.attributes.created_at, queryBuilder, value);
      },
      description(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("description", "description", spec_repositoryRelationshipType.attributes.description, queryBuilder, value);
      },
      isDirected(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("isDirected", "is_directed", spec_repositoryRelationshipType.attributes.is_directed, queryBuilder, value);
      },
      name(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("name", "name", spec_repositoryRelationshipType.attributes.name, queryBuilder, value);
      },
      not: RepositoryFilter_notApply,
      or: RepositoryFilter_orApply,
      organization($where, value) {
        return pgConnectionFilterApplySingleRelation(spec_resource_organizationPgResource, organizationIdentifier, registryConfig.pgRelations.repositoryRelationshipType.organizationByMyOrganizationId.localAttributes, registryConfig.pgRelations.repositoryRelationshipType.organizationByMyOrganizationId.remoteAttributes, $where, value);
      },
      organizationExists($where, value) {
        return pgConnectionFilterApplyForwardRelationExists(spec_resource_organizationPgResource, organizationIdentifier, registryConfig.pgRelations.repositoryRelationshipType.organizationByMyOrganizationId.localAttributes, registryConfig.pgRelations.repositoryRelationshipType.organizationByMyOrganizationId.remoteAttributes, $where, value);
      },
      organizationId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("organizationId", "organization_id", spec_repositoryRelationshipType.attributes.organization_id, queryBuilder, value);
      },
      repositoryRelationshipsByRelationshipTypeId($where, value) {
        assertAllowed(value, "object");
        const $rel = $where.andPlan();
        $rel.extensions.pgFilterRelation = {
          tableExpression: repositoryRelationshipIdentifier,
          alias: spec_resource_repository_relationshipPgResource.name,
          localAttributes: registryConfig.pgRelations.repositoryRelationshipType.repositoryRelationshipsByTheirRelationshipTypeId.localAttributes,
          remoteAttributes: registryConfig.pgRelations.repositoryRelationshipType.repositoryRelationshipsByTheirRelationshipTypeId.remoteAttributes
        };
        return $rel;
      },
      repositoryRelationshipsByRelationshipTypeIdExist($where, value) {
        assertAllowed(value, "scalar");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: repositoryRelationshipIdentifier,
          alias: spec_resource_repository_relationshipPgResource.name,
          equals: value
        });
        registryConfig.pgRelations.repositoryRelationshipType.repositoryRelationshipsByTheirRelationshipTypeId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.repositoryRelationshipType.repositoryRelationshipsByTheirRelationshipTypeId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
      },
      rowId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("rowId", "id", spec_repositoryRelationshipType.attributes.id, queryBuilder, value);
      }
    }
  },
  RepositoryRelationshipTypeHavingAverageInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_average, spec_repositoryRelationshipType.attributes.created_at, "created_at", $having);
      }
    }
  },
  RepositoryRelationshipTypeHavingDistinctCountInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_distinctCount, spec_repositoryRelationshipType.attributes.created_at, "created_at", $having);
      }
    }
  },
  RepositoryRelationshipTypeHavingInput: {
    plans: {
      AND: pgAggregatesApplyAnd,
      average: pgAggregatesPlanAggregatesField,
      distinctCount: pgAggregatesPlanAggregatesField,
      max: pgAggregatesPlanAggregatesField,
      min: pgAggregatesPlanAggregatesField,
      OR: RepositoryCollaboratorHavingInput_ORApply,
      stddevPopulation: pgAggregatesPlanAggregatesField,
      stddevSample: pgAggregatesPlanAggregatesField,
      sum: pgAggregatesPlanAggregatesField,
      variancePopulation: pgAggregatesPlanAggregatesField,
      varianceSample: pgAggregatesPlanAggregatesField
    }
  },
  RepositoryRelationshipTypeHavingMaxInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_max, spec_repositoryRelationshipType.attributes.created_at, "created_at", $having);
      }
    }
  },
  RepositoryRelationshipTypeHavingMinInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_min, spec_repositoryRelationshipType.attributes.created_at, "created_at", $having);
      }
    }
  },
  RepositoryRelationshipTypeHavingStddevPopulationInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevPopulation, spec_repositoryRelationshipType.attributes.created_at, "created_at", $having);
      }
    }
  },
  RepositoryRelationshipTypeHavingStddevSampleInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevSample, spec_repositoryRelationshipType.attributes.created_at, "created_at", $having);
      }
    }
  },
  RepositoryRelationshipTypeHavingSumInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_sum, spec_repositoryRelationshipType.attributes.created_at, "created_at", $having);
      }
    }
  },
  RepositoryRelationshipTypeHavingVariancePopulationInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_variancePopulation, spec_repositoryRelationshipType.attributes.created_at, "created_at", $having);
      }
    }
  },
  RepositoryRelationshipTypeHavingVarianceSampleInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_varianceSample, spec_repositoryRelationshipType.attributes.created_at, "created_at", $having);
      }
    }
  },
  RepositoryRelationshipTypeInput: {
    baked: createObjectAndApplyChildren,
    plans: {
      createdAt: RepositoryRelationshipMetadatumInput_createdAtApply,
      description: RepositoryRelationshipTypeInput_descriptionApply,
      isDirected: RepositoryRelationshipTypeInput_isDirectedApply,
      name: RepositoryRelationshipTypeInput_nameApply,
      organizationId: RepositoryRelationshipTypeInput_organizationIdApply,
      rowId: RepositoryRelationshipMetadatumInput_rowIdApply
    }
  },
  RepositoryRelationshipTypePatch: {
    baked: createObjectAndApplyChildren,
    plans: {
      createdAt: RepositoryRelationshipMetadatumInput_createdAtApply,
      description: RepositoryRelationshipTypeInput_descriptionApply,
      isDirected: RepositoryRelationshipTypeInput_isDirectedApply,
      name: RepositoryRelationshipTypeInput_nameApply,
      organizationId: RepositoryRelationshipTypeInput_organizationIdApply,
      rowId: RepositoryRelationshipMetadatumInput_rowIdApply
    }
  },
  RepositoryRelationshipTypeToManyRepositoryRelationshipFilter: {
    plans: {
      aggregates: RepositoryToManyRepositoryCollaboratorFilter_aggregatesApply,
      every: RepositoryToManyRepositoryCollaboratorFilter_everyApply,
      none: RepositoryToManyRepositoryCollaboratorFilter_noneApply,
      some: RepositoryToManyRepositoryCollaboratorFilter_someApply
    }
  },
  RepositoryRelationshipVariancePopulationAggregateFilter: {
    plans: {
      confidence($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_variancePopulation, "confidence", TYPES.float, TYPES.float4, $parent, input);
      }
    }
  },
  RepositoryRelationshipVarianceSampleAggregateFilter: {
    plans: {
      confidence($parent, input) {
        return pgAggregateApplyAttributeOrder(pgAggregateSpec_varianceSample, "confidence", TYPES.float, TYPES.float4, $parent, input);
      }
    }
  },
  RepositoryToManyExternalDependencyFilter: {
    plans: {
      aggregates: RepositoryToManyRepositoryCollaboratorFilter_aggregatesApply,
      every: RepositoryToManyRepositoryCollaboratorFilter_everyApply,
      none: RepositoryToManyRepositoryCollaboratorFilter_noneApply,
      some: RepositoryToManyRepositoryCollaboratorFilter_someApply
    }
  },
  RepositoryToManyPullRequestFilter: {
    plans: {
      aggregates: RepositoryToManyRepositoryCollaboratorFilter_aggregatesApply,
      every: RepositoryToManyRepositoryCollaboratorFilter_everyApply,
      none: RepositoryToManyRepositoryCollaboratorFilter_noneApply,
      some: RepositoryToManyRepositoryCollaboratorFilter_someApply
    }
  },
  RepositoryToManyRepositoryCollaboratorFilter: {
    plans: {
      aggregates: RepositoryToManyRepositoryCollaboratorFilter_aggregatesApply,
      every: RepositoryToManyRepositoryCollaboratorFilter_everyApply,
      none: RepositoryToManyRepositoryCollaboratorFilter_noneApply,
      some: RepositoryToManyRepositoryCollaboratorFilter_someApply
    }
  },
  RepositoryToManyRepositoryRelationshipFilter: {
    plans: {
      aggregates: RepositoryToManyRepositoryCollaboratorFilter_aggregatesApply,
      every: RepositoryToManyRepositoryCollaboratorFilter_everyApply,
      none: RepositoryToManyRepositoryCollaboratorFilter_noneApply,
      some: RepositoryToManyRepositoryCollaboratorFilter_someApply
    }
  },
  StringFilter: {
    plans: {
      distinctFrom: pgAggregatesApply_distinctFrom,
      distinctFromInsensitive($where, value) {
        return pgConnectionFilterApplyFromOperator("distinctFromInsensitive", resolveDistinct, undefined, resolveInputCodecInsensitiveOperator, resolveSqlIdentifierInsensitiveOperator, resolveSqlValueInsensitiveOperator, $where, value);
      },
      endsWith($where, value) {
        return pgConnectionFilterApplyFromOperator("endsWith", resolveLike, resolveInputEndsWith, resolveInputCodecSensitive, resolveSqlIdentifierSensitive, undefined, $where, value);
      },
      endsWithInsensitive($where, value) {
        return pgConnectionFilterApplyFromOperator("endsWithInsensitive", resolveILike, resolveInputEndsWith, resolveInputCodecInsensitive, resolveSqlIdentifierInsensitive, undefined, $where, value);
      },
      equalTo: pgAggregatesApply_equalTo,
      equalToInsensitive($where, value) {
        return pgConnectionFilterApplyFromOperator("equalToInsensitive", resolveEquality, undefined, resolveInputCodecInsensitiveOperator, resolveSqlIdentifierInsensitiveOperator, resolveSqlValueInsensitiveOperator, $where, value);
      },
      greaterThan: pgAggregatesApply_greaterThan,
      greaterThanInsensitive($where, value) {
        return pgConnectionFilterApplyFromOperator("greaterThanInsensitive", resolveGreaterThan, undefined, resolveInputCodecInsensitiveOperator, resolveSqlIdentifierInsensitiveOperator, resolveSqlValueInsensitiveOperator, $where, value);
      },
      greaterThanOrEqualTo: pgAggregatesApply_greaterThanOrEqualTo,
      greaterThanOrEqualToInsensitive($where, value) {
        return pgConnectionFilterApplyFromOperator("greaterThanOrEqualToInsensitive", resolveGreaterThanOrEqualTo, undefined, resolveInputCodecInsensitiveOperator, resolveSqlIdentifierInsensitiveOperator, resolveSqlValueInsensitiveOperator, $where, value);
      },
      in: pgAggregatesApply_in,
      includes($where, value) {
        return pgConnectionFilterApplyFromOperator("includes", resolveLike, resolveInputContains, resolveInputCodecSensitive, resolveSqlIdentifierSensitive, undefined, $where, value);
      },
      includesInsensitive($where, value) {
        return pgConnectionFilterApplyFromOperator("includesInsensitive", resolveILike, resolveInputContains, resolveInputCodecInsensitive, resolveSqlIdentifierInsensitive, undefined, $where, value);
      },
      inInsensitive($where, value) {
        return pgConnectionFilterApplyFromOperator("inInsensitive", resolveEqualsAny, undefined, resolveInputCodecInsensitiveOperator_list, resolveSqlIdentifierInsensitiveOperator, resolveSqlValueInsensitiveOperator_list, $where, value);
      },
      isNull: pgAggregatesApply_isNull,
      lessThan: pgAggregatesApply_lessThan,
      lessThanInsensitive($where, value) {
        return pgConnectionFilterApplyFromOperator("lessThanInsensitive", resolveLessThan, undefined, resolveInputCodecInsensitiveOperator, resolveSqlIdentifierInsensitiveOperator, resolveSqlValueInsensitiveOperator, $where, value);
      },
      lessThanOrEqualTo: pgAggregatesApply_lessThanOrEqualTo,
      lessThanOrEqualToInsensitive($where, value) {
        return pgConnectionFilterApplyFromOperator("lessThanOrEqualToInsensitive", resolveLessThanOrEqualTo, undefined, resolveInputCodecInsensitiveOperator, resolveSqlIdentifierInsensitiveOperator, resolveSqlValueInsensitiveOperator, $where, value);
      },
      like($where, value) {
        return pgConnectionFilterApplyFromOperator("like", resolveLike, undefined, resolveInputCodecSensitive, resolveSqlIdentifierSensitive, undefined, $where, value);
      },
      likeInsensitive($where, value) {
        return pgConnectionFilterApplyFromOperator("likeInsensitive", resolveILike, undefined, resolveInputCodecInsensitive, resolveSqlIdentifierInsensitive, undefined, $where, value);
      },
      notDistinctFrom: pgAggregatesApply_notDistinctFrom,
      notDistinctFromInsensitive($where, value) {
        return pgConnectionFilterApplyFromOperator("notDistinctFromInsensitive", resolveNotDistinct, undefined, resolveInputCodecInsensitiveOperator, resolveSqlIdentifierInsensitiveOperator, resolveSqlValueInsensitiveOperator, $where, value);
      },
      notEndsWith($where, value) {
        return pgConnectionFilterApplyFromOperator("notEndsWith", resolveNotLike, resolveInputEndsWith, resolveInputCodecSensitive, resolveSqlIdentifierSensitive, undefined, $where, value);
      },
      notEndsWithInsensitive($where, value) {
        return pgConnectionFilterApplyFromOperator("notEndsWithInsensitive", resolveNotILike, resolveInputEndsWith, resolveInputCodecInsensitive, resolveSqlIdentifierInsensitive, undefined, $where, value);
      },
      notEqualTo: pgAggregatesApply_notEqualTo,
      notEqualToInsensitive($where, value) {
        return pgConnectionFilterApplyFromOperator("notEqualToInsensitive", resolveInequality, undefined, resolveInputCodecInsensitiveOperator, resolveSqlIdentifierInsensitiveOperator, resolveSqlValueInsensitiveOperator, $where, value);
      },
      notIn: pgAggregatesApply_notIn,
      notIncludes($where, value) {
        return pgConnectionFilterApplyFromOperator("notIncludes", resolveNotLike, resolveInputContains, resolveInputCodecSensitive, resolveSqlIdentifierSensitive, undefined, $where, value);
      },
      notIncludesInsensitive($where, value) {
        return pgConnectionFilterApplyFromOperator("notIncludesInsensitive", resolveNotILike, resolveInputContains, resolveInputCodecInsensitive, resolveSqlIdentifierInsensitive, undefined, $where, value);
      },
      notInInsensitive($where, value) {
        return pgConnectionFilterApplyFromOperator("notInInsensitive", resolveInequalAll, undefined, resolveInputCodecInsensitiveOperator_list, resolveSqlIdentifierInsensitiveOperator, resolveSqlValueInsensitiveOperator_list, $where, value);
      },
      notLike($where, value) {
        return pgConnectionFilterApplyFromOperator("notLike", resolveNotLike, undefined, resolveInputCodecSensitive, resolveSqlIdentifierSensitive, undefined, $where, value);
      },
      notLikeInsensitive($where, value) {
        return pgConnectionFilterApplyFromOperator("notLikeInsensitive", resolveNotILike, undefined, resolveInputCodecInsensitive, resolveSqlIdentifierInsensitive, undefined, $where, value);
      },
      notStartsWith($where, value) {
        return pgConnectionFilterApplyFromOperator("notStartsWith", resolveNotLike, resolveInputStartsWith, resolveInputCodecSensitive, resolveSqlIdentifierSensitive, undefined, $where, value);
      },
      notStartsWithInsensitive($where, value) {
        return pgConnectionFilterApplyFromOperator("notStartsWithInsensitive", resolveNotILike, resolveInputStartsWith, resolveInputCodecInsensitive, resolveSqlIdentifierInsensitive, undefined, $where, value);
      },
      startsWith($where, value) {
        return pgConnectionFilterApplyFromOperator("startsWith", resolveLike, resolveInputStartsWith, resolveInputCodecSensitive, resolveSqlIdentifierSensitive, undefined, $where, value);
      },
      startsWithInsensitive($where, value) {
        return pgConnectionFilterApplyFromOperator("startsWithInsensitive", resolveILike, resolveInputStartsWith, resolveInputCodecInsensitive, resolveSqlIdentifierInsensitive, undefined, $where, value);
      }
    }
  },
  UpdateExternalDependencyByIdInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate,
      patch: applyCreateFields
    }
  },
  UpdateExternalDependencyInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate,
      patch: applyCreateFields
    }
  },
  UpdateOrganizationByIdInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate,
      patch: applyCreateFields
    }
  },
  UpdateOrganizationInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate,
      patch: applyCreateFields
    }
  },
  UpdatePullRequestByIdInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate,
      patch: applyCreateFields
    }
  },
  UpdatePullRequestCommentByIdInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate,
      patch: applyCreateFields
    }
  },
  UpdatePullRequestCommentInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate,
      patch: applyCreateFields
    }
  },
  UpdatePullRequestInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate,
      patch: applyCreateFields
    }
  },
  UpdatePullRequestReviewByIdInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate,
      patch: applyCreateFields
    }
  },
  UpdatePullRequestReviewInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate,
      patch: applyCreateFields
    }
  },
  UpdateRepositoryByIdInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate,
      patch: applyCreateFields
    }
  },
  UpdateRepositoryCollaboratorByIdInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate,
      patch: applyCreateFields
    }
  },
  UpdateRepositoryCollaboratorInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate,
      patch: applyCreateFields
    }
  },
  UpdateRepositoryInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate,
      patch: applyCreateFields
    }
  },
  UpdateRepositoryRelationshipByIdInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate,
      patch: applyCreateFields
    }
  },
  UpdateRepositoryRelationshipInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate,
      patch: applyCreateFields
    }
  },
  UpdateRepositoryRelationshipMetadatumByIdInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate,
      patch: applyCreateFields
    }
  },
  UpdateRepositoryRelationshipMetadatumInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate,
      patch: applyCreateFields
    }
  },
  UpdateRepositoryRelationshipTypeByIdInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate,
      patch: applyCreateFields
    }
  },
  UpdateRepositoryRelationshipTypeInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate,
      patch: applyCreateFields
    }
  },
  UpdateUserByIdInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate,
      patch: applyCreateFields
    }
  },
  UpdateUserInput: {
    plans: {
      clientMutationId: applyClientMutationIdForCreate,
      patch: applyCreateFields
    }
  },
  UserCondition: {
    plans: {
      avatarUrl: UserCondition_avatarUrlApply,
      bio($condition, val) {
        return applyAttributeCondition("bio", TYPES.text, $condition, val);
      },
      createdAt: RepositoryCondition_createdAtApply,
      email($condition, val) {
        return applyAttributeCondition("email", TYPES.text, $condition, val);
      },
      identityProviderId($condition, val) {
        return applyAttributeCondition("identity_provider_id", TYPES.uuid, $condition, val);
      },
      name: RepositoryCondition_nameApply,
      rowId: RepositoryCondition_rowIdApply,
      updatedAt: RepositoryCondition_updatedAtApply,
      username($condition, val) {
        return applyAttributeCondition("username", TYPES.text, $condition, val);
      }
    }
  },
  UserFilter: {
    plans: {
      and: RepositoryFilter_andApply,
      authoredPullRequestComments($where, value) {
        assertAllowed(value, "object");
        const $rel = $where.andPlan();
        $rel.extensions.pgFilterRelation = {
          tableExpression: pullRequestCommentIdentifier,
          alias: spec_resource_pull_request_commentPgResource.name,
          localAttributes: registryConfig.pgRelations.user.pullRequestCommentsByTheirAuthorId.localAttributes,
          remoteAttributes: registryConfig.pgRelations.user.pullRequestCommentsByTheirAuthorId.remoteAttributes
        };
        return $rel;
      },
      authoredPullRequestCommentsExist($where, value) {
        assertAllowed(value, "scalar");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: pullRequestCommentIdentifier,
          alias: spec_resource_pull_request_commentPgResource.name,
          equals: value
        });
        registryConfig.pgRelations.user.pullRequestCommentsByTheirAuthorId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.user.pullRequestCommentsByTheirAuthorId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
      },
      authoredPullRequests($where, value) {
        assertAllowed(value, "object");
        const $rel = $where.andPlan();
        $rel.extensions.pgFilterRelation = {
          tableExpression: pullRequestIdentifier,
          alias: spec_resource_pull_requestPgResource.name,
          localAttributes: registryConfig.pgRelations.user.pullRequestsByTheirAuthorId.localAttributes,
          remoteAttributes: registryConfig.pgRelations.user.pullRequestsByTheirAuthorId.remoteAttributes
        };
        return $rel;
      },
      authoredPullRequestsExist($where, value) {
        assertAllowed(value, "scalar");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: pullRequestIdentifier,
          alias: spec_resource_pull_requestPgResource.name,
          equals: value
        });
        registryConfig.pgRelations.user.pullRequestsByTheirAuthorId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.user.pullRequestsByTheirAuthorId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
      },
      avatarUrl(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("avatarUrl", "avatar_url", spec_user.attributes.avatar_url, queryBuilder, value);
      },
      bio(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("bio", "bio", spec_user.attributes.bio, queryBuilder, value);
      },
      createdAt(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("createdAt", "created_at", spec_user.attributes.created_at, queryBuilder, value);
      },
      email(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("email", "email", spec_user.attributes.email, queryBuilder, value);
      },
      identityProviderId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("identityProviderId", "identity_provider_id", spec_user.attributes.identity_provider_id, queryBuilder, value);
      },
      name(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("name", "name", spec_user.attributes.name, queryBuilder, value);
      },
      not: RepositoryFilter_notApply,
      or: RepositoryFilter_orApply,
      pullRequestsByMergedById($where, value) {
        assertAllowed(value, "object");
        const $rel = $where.andPlan();
        $rel.extensions.pgFilterRelation = {
          tableExpression: pullRequestIdentifier,
          alias: spec_resource_pull_requestPgResource.name,
          localAttributes: registryConfig.pgRelations.user.pullRequestsByTheirMergedById.localAttributes,
          remoteAttributes: registryConfig.pgRelations.user.pullRequestsByTheirMergedById.remoteAttributes
        };
        return $rel;
      },
      pullRequestsByMergedByIdExist($where, value) {
        assertAllowed(value, "scalar");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: pullRequestIdentifier,
          alias: spec_resource_pull_requestPgResource.name,
          equals: value
        });
        registryConfig.pgRelations.user.pullRequestsByTheirMergedById.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.user.pullRequestsByTheirMergedById.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
      },
      repositoriesByOwnerId($where, value) {
        assertAllowed(value, "object");
        const $rel = $where.andPlan();
        $rel.extensions.pgFilterRelation = {
          tableExpression: repositoryIdentifier,
          alias: spec_resource_repositoryPgResource.name,
          localAttributes: registryConfig.pgRelations.user.repositoriesByTheirOwnerId.localAttributes,
          remoteAttributes: registryConfig.pgRelations.user.repositoriesByTheirOwnerId.remoteAttributes
        };
        return $rel;
      },
      repositoriesByOwnerIdExist($where, value) {
        assertAllowed(value, "scalar");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: repositoryIdentifier,
          alias: spec_resource_repositoryPgResource.name,
          equals: value
        });
        registryConfig.pgRelations.user.repositoriesByTheirOwnerId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.user.repositoriesByTheirOwnerId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
      },
      repositoryCollaborators($where, value) {
        assertAllowed(value, "object");
        const $rel = $where.andPlan();
        $rel.extensions.pgFilterRelation = {
          tableExpression: repositoryCollaboratorIdentifier,
          alias: spec_resource_repository_collaboratorPgResource.name,
          localAttributes: registryConfig.pgRelations.user.repositoryCollaboratorsByTheirUserId.localAttributes,
          remoteAttributes: registryConfig.pgRelations.user.repositoryCollaboratorsByTheirUserId.remoteAttributes
        };
        return $rel;
      },
      repositoryCollaboratorsExist($where, value) {
        assertAllowed(value, "scalar");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: repositoryCollaboratorIdentifier,
          alias: spec_resource_repository_collaboratorPgResource.name,
          equals: value
        });
        registryConfig.pgRelations.user.repositoryCollaboratorsByTheirUserId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.user.repositoryCollaboratorsByTheirUserId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
      },
      reviewedPullRequestReviews($where, value) {
        assertAllowed(value, "object");
        const $rel = $where.andPlan();
        $rel.extensions.pgFilterRelation = {
          tableExpression: pullRequestReviewIdentifier,
          alias: spec_resource_pull_request_reviewPgResource.name,
          localAttributes: registryConfig.pgRelations.user.pullRequestReviewsByTheirReviewerId.localAttributes,
          remoteAttributes: registryConfig.pgRelations.user.pullRequestReviewsByTheirReviewerId.remoteAttributes
        };
        return $rel;
      },
      reviewedPullRequestReviewsExist($where, value) {
        assertAllowed(value, "scalar");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: pullRequestReviewIdentifier,
          alias: spec_resource_pull_request_reviewPgResource.name,
          equals: value
        });
        registryConfig.pgRelations.user.pullRequestReviewsByTheirReviewerId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.user.pullRequestReviewsByTheirReviewerId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
      },
      rowId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("rowId", "id", spec_user.attributes.id, queryBuilder, value);
      },
      updatedAt(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("updatedAt", "updated_at", spec_user.attributes.updated_at, queryBuilder, value);
      },
      username(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("username", "username", spec_user.attributes.username, queryBuilder, value);
      }
    }
  },
  UserHavingAverageInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_average, spec_user.attributes.created_at, "created_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_average, spec_user.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  UserHavingDistinctCountInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_distinctCount, spec_user.attributes.created_at, "created_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_distinctCount, spec_user.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  UserHavingInput: {
    plans: {
      AND: pgAggregatesApplyAnd,
      average: pgAggregatesPlanAggregatesField,
      distinctCount: pgAggregatesPlanAggregatesField,
      max: pgAggregatesPlanAggregatesField,
      min: pgAggregatesPlanAggregatesField,
      OR: RepositoryCollaboratorHavingInput_ORApply,
      stddevPopulation: pgAggregatesPlanAggregatesField,
      stddevSample: pgAggregatesPlanAggregatesField,
      sum: pgAggregatesPlanAggregatesField,
      variancePopulation: pgAggregatesPlanAggregatesField,
      varianceSample: pgAggregatesPlanAggregatesField
    }
  },
  UserHavingMaxInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_max, spec_user.attributes.created_at, "created_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_max, spec_user.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  UserHavingMinInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_min, spec_user.attributes.created_at, "created_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_min, spec_user.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  UserHavingStddevPopulationInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevPopulation, spec_user.attributes.created_at, "created_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevPopulation, spec_user.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  UserHavingStddevSampleInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevSample, spec_user.attributes.created_at, "created_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_stddevSample, spec_user.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  UserHavingSumInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_sum, spec_user.attributes.created_at, "created_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_sum, spec_user.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  UserHavingVariancePopulationInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_variancePopulation, spec_user.attributes.created_at, "created_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_variancePopulation, spec_user.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  UserHavingVarianceSampleInput: {
    plans: {
      createdAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_varianceSample, spec_user.attributes.created_at, "created_at", $having);
      },
      updatedAt($having) {
        return pgAggregatesApplyAttributeFilter(pgAggregateSpec_varianceSample, spec_user.attributes.updated_at, "updated_at", $having);
      }
    }
  },
  UserInput: {
    baked: createObjectAndApplyChildren,
    plans: {
      avatarUrl: UserInput_avatarUrlApply,
      bio: UserInput_bioApply,
      createdAt: RepositoryRelationshipMetadatumInput_createdAtApply,
      email: UserInput_emailApply,
      identityProviderId: UserInput_identityProviderIdApply,
      name: RepositoryRelationshipTypeInput_nameApply,
      rowId: RepositoryRelationshipMetadatumInput_rowIdApply,
      updatedAt: RepositoryCollaboratorInput_updatedAtApply,
      username: UserInput_usernameApply
    }
  },
  UserPatch: {
    baked: createObjectAndApplyChildren,
    plans: {
      avatarUrl: UserInput_avatarUrlApply,
      bio: UserInput_bioApply,
      createdAt: RepositoryRelationshipMetadatumInput_createdAtApply,
      email: UserInput_emailApply,
      identityProviderId: UserInput_identityProviderIdApply,
      name: RepositoryRelationshipTypeInput_nameApply,
      rowId: RepositoryRelationshipMetadatumInput_rowIdApply,
      updatedAt: RepositoryCollaboratorInput_updatedAtApply,
      username: UserInput_usernameApply
    }
  },
  UserToManyPullRequestCommentFilter: {
    plans: {
      aggregates: RepositoryToManyRepositoryCollaboratorFilter_aggregatesApply,
      every: RepositoryToManyRepositoryCollaboratorFilter_everyApply,
      none: RepositoryToManyRepositoryCollaboratorFilter_noneApply,
      some: RepositoryToManyRepositoryCollaboratorFilter_someApply
    }
  },
  UserToManyPullRequestFilter: {
    plans: {
      aggregates: RepositoryToManyRepositoryCollaboratorFilter_aggregatesApply,
      every: RepositoryToManyRepositoryCollaboratorFilter_everyApply,
      none: RepositoryToManyRepositoryCollaboratorFilter_noneApply,
      some: RepositoryToManyRepositoryCollaboratorFilter_someApply
    }
  },
  UserToManyPullRequestReviewFilter: {
    plans: {
      aggregates: RepositoryToManyRepositoryCollaboratorFilter_aggregatesApply,
      every: RepositoryToManyRepositoryCollaboratorFilter_everyApply,
      none: RepositoryToManyRepositoryCollaboratorFilter_noneApply,
      some: RepositoryToManyRepositoryCollaboratorFilter_someApply
    }
  },
  UserToManyRepositoryCollaboratorFilter: {
    plans: {
      aggregates: RepositoryToManyRepositoryCollaboratorFilter_aggregatesApply,
      every: RepositoryToManyRepositoryCollaboratorFilter_everyApply,
      none: RepositoryToManyRepositoryCollaboratorFilter_noneApply,
      some: RepositoryToManyRepositoryCollaboratorFilter_someApply
    }
  },
  UserToManyRepositoryFilter: {
    plans: {
      aggregates: RepositoryToManyRepositoryCollaboratorFilter_aggregatesApply,
      every: RepositoryToManyRepositoryCollaboratorFilter_everyApply,
      none: RepositoryToManyRepositoryCollaboratorFilter_noneApply,
      some: RepositoryToManyRepositoryCollaboratorFilter_someApply
    }
  },
  UUIDFilter: {
    plans: {
      distinctFrom: pgAggregatesApply_distinctFrom,
      equalTo: pgAggregatesApply_equalTo,
      greaterThan: pgAggregatesApply_greaterThan,
      greaterThanOrEqualTo: pgAggregatesApply_greaterThanOrEqualTo,
      in: pgAggregatesApply_in,
      isNull: pgAggregatesApply_isNull,
      lessThan: pgAggregatesApply_lessThan,
      lessThanOrEqualTo: pgAggregatesApply_lessThanOrEqualTo,
      notDistinctFrom: pgAggregatesApply_notDistinctFrom,
      notEqualTo: pgAggregatesApply_notEqualTo,
      notIn: pgAggregatesApply_notIn
    }
  },
  VisibilityFilter: {
    plans: {
      distinctFrom: pgAggregatesApply_distinctFrom,
      equalTo: pgAggregatesApply_equalTo,
      greaterThan: pgAggregatesApply_greaterThan,
      greaterThanOrEqualTo: pgAggregatesApply_greaterThanOrEqualTo,
      in: pgAggregatesApply_in,
      isNull: pgAggregatesApply_isNull,
      lessThan: pgAggregatesApply_lessThan,
      lessThanOrEqualTo: pgAggregatesApply_lessThanOrEqualTo,
      notDistinctFrom: pgAggregatesApply_notDistinctFrom,
      notEqualTo: pgAggregatesApply_notEqualTo,
      notIn: pgAggregatesApply_notIn
    }
  }
};
export const scalars = {
  BigFloat: {
    serialize: toString,
    parseValue: toString,
    parseLiteral(ast) {
      if (ast.kind === Kind.STRING) return ast.value;
      throw new GraphQLError(`BigFloat can only parse string values (kind='${ast.kind}')`);
    }
  },
  BigInt: {
    serialize: toString,
    parseValue: toString,
    parseLiteral(ast) {
      if (ast.kind === Kind.STRING) return ast.value;
      throw new GraphQLError(`BigInt can only parse string values (kind='${ast.kind}')`);
    }
  },
  Cursor: {
    serialize: toString,
    parseValue: toString,
    parseLiteral(ast) {
      if (ast.kind === Kind.STRING) return ast.value;
      throw new GraphQLError(`Cursor can only parse string values (kind='${ast.kind}')`);
    }
  },
  Datetime: {
    serialize: toString,
    parseValue: toString,
    parseLiteral(ast) {
      if (ast.kind === Kind.STRING) return ast.value;
      throw new GraphQLError(`Datetime can only parse string values (kind='${ast.kind}')`);
    }
  },
  UUID: {
    serialize: toString,
    parseValue(value) {
      return coerce("" + value);
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.STRING) return coerce(ast.value);
      throw new GraphQLError(`UUID can only parse string values (kind = '${ast.kind}')`);
    }
  }
};
export const enums = {
  ExternalDependencyGroupBy: {
    values: {
      CREATED_AT: RepositoryCollaboratorGroupBy_CREATED_ATApply,
      CREATED_AT_TRUNCATED_TO_DAY: RepositoryCollaboratorGroupBy_CREATED_AT_TRUNCATED_TO_DAYApply,
      CREATED_AT_TRUNCATED_TO_HOUR: RepositoryCollaboratorGroupBy_CREATED_AT_TRUNCATED_TO_HOURApply,
      DETECTION_SOURCE: ExternalDependencyGroupBy_DETECTION_SOURCEApply,
      PACKAGE_MANAGER($pgSelect) {
        applyGroupByAttribute("package_manager", TYPES.text, $pgSelect);
      },
      PACKAGE_NAME($pgSelect) {
        applyGroupByAttribute("package_name", TYPES.text, $pgSelect);
      },
      REPOSITORY_ID: RepositoryCollaboratorGroupBy_REPOSITORY_IDApply,
      VERSION_CONSTRAINT: ExternalDependencyGroupBy_VERSION_CONSTRAINTApply
    }
  },
  ExternalDependencyOrderBy: {
    values: {
      CREATED_AT_ASC: RepositoryOrderBy_CREATED_AT_ASCApply,
      CREATED_AT_DESC: RepositoryOrderBy_CREATED_AT_DESCApply,
      DETECTION_SOURCE_ASC: ExternalDependencyOrderBy_DETECTION_SOURCE_ASCApply,
      DETECTION_SOURCE_DESC: ExternalDependencyOrderBy_DETECTION_SOURCE_DESCApply,
      PACKAGE_MANAGER_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "package_manager",
          direction: "ASC"
        });
      },
      PACKAGE_MANAGER_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "package_manager",
          direction: "DESC"
        });
      },
      PACKAGE_NAME_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "package_name",
          direction: "ASC"
        });
      },
      PACKAGE_NAME_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "package_name",
          direction: "DESC"
        });
      },
      PRIMARY_KEY_ASC(queryBuilder) {
        external_dependencyUniques[0].attributes.forEach(attributeName => {
          queryBuilder.orderBy({
            attribute: attributeName,
            direction: "ASC"
          });
        });
        queryBuilder.setOrderIsUnique();
      },
      PRIMARY_KEY_DESC(queryBuilder) {
        external_dependencyUniques[0].attributes.forEach(attributeName => {
          queryBuilder.orderBy({
            attribute: attributeName,
            direction: "DESC"
          });
        });
        queryBuilder.setOrderIsUnique();
      },
      REPOSITORY_ID_ASC: PullRequestOrderBy_REPOSITORY_ID_ASCApply,
      REPOSITORY_ID_DESC: PullRequestOrderBy_REPOSITORY_ID_DESCApply,
      ROW_ID_ASC: RepositoryOrderBy_ROW_ID_ASCApply,
      ROW_ID_DESC: RepositoryOrderBy_ROW_ID_DESCApply,
      VERSION_CONSTRAINT_ASC: ExternalDependencyOrderBy_VERSION_CONSTRAINT_ASCApply,
      VERSION_CONSTRAINT_DESC: ExternalDependencyOrderBy_VERSION_CONSTRAINT_DESCApply
    }
  },
  OrganizationGroupBy: {
    values: {
      AVATAR_URL: UserGroupBy_AVATAR_URLApply,
      BILLING_ACCOUNT_ID($pgSelect) {
        applyGroupByAttribute("billing_account_id", TYPES.text, $pgSelect);
      },
      CREATED_AT: RepositoryCollaboratorGroupBy_CREATED_ATApply,
      CREATED_AT_TRUNCATED_TO_DAY: RepositoryCollaboratorGroupBy_CREATED_AT_TRUNCATED_TO_DAYApply,
      CREATED_AT_TRUNCATED_TO_HOUR: RepositoryCollaboratorGroupBy_CREATED_AT_TRUNCATED_TO_HOURApply,
      DELETED_AT($pgSelect) {
        applyGroupByAttribute("deleted_at", TYPES.timestamp, $pgSelect);
      },
      DELETED_AT_TRUNCATED_TO_DAY(qb) {
        applyGroupByAggregateSpec(pgAggregateGroupBySpec_truncated_to_day, "deleted_at", TYPES.timestamp, qb);
      },
      DELETED_AT_TRUNCATED_TO_HOUR(qb) {
        applyGroupByAggregateSpec(pgAggregateGroupBySpec_truncated_to_hour, "deleted_at", TYPES.timestamp, qb);
      },
      DELETION_REASON($pgSelect) {
        applyGroupByAttribute("deletion_reason", TYPES.text, $pgSelect);
      },
      DESCRIPTION: PullRequestGroupBy_DESCRIPTIONApply,
      SUBSCRIPTION_ID($pgSelect) {
        applyGroupByAttribute("subscription_id", TYPES.text, $pgSelect);
      },
      UPDATED_AT: RepositoryCollaboratorGroupBy_UPDATED_ATApply,
      UPDATED_AT_TRUNCATED_TO_DAY: RepositoryCollaboratorGroupBy_UPDATED_AT_TRUNCATED_TO_DAYApply,
      UPDATED_AT_TRUNCATED_TO_HOUR: RepositoryCollaboratorGroupBy_UPDATED_AT_TRUNCATED_TO_HOURApply
    }
  },
  OrganizationOrderBy: {
    values: {
      AVATAR_URL_ASC: UserOrderBy_AVATAR_URL_ASCApply,
      AVATAR_URL_DESC: UserOrderBy_AVATAR_URL_DESCApply,
      BILLING_ACCOUNT_ID_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "billing_account_id",
          direction: "ASC"
        });
      },
      BILLING_ACCOUNT_ID_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "billing_account_id",
          direction: "DESC"
        });
      },
      CREATED_AT_ASC: RepositoryOrderBy_CREATED_AT_ASCApply,
      CREATED_AT_DESC: RepositoryOrderBy_CREATED_AT_DESCApply,
      DELETED_AT_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "deleted_at",
          direction: "ASC"
        });
      },
      DELETED_AT_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "deleted_at",
          direction: "DESC"
        });
      },
      DELETION_REASON_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "deletion_reason",
          direction: "ASC"
        });
      },
      DELETION_REASON_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "deletion_reason",
          direction: "DESC"
        });
      },
      DESCRIPTION_ASC: RepositoryOrderBy_DESCRIPTION_ASCApply,
      DESCRIPTION_DESC: RepositoryOrderBy_DESCRIPTION_DESCApply,
      IDP_ORGANIZATION_ID_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "idp_organization_id",
          direction: "ASC"
        });
        queryBuilder.setOrderIsUnique();
      },
      IDP_ORGANIZATION_ID_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "idp_organization_id",
          direction: "DESC"
        });
        queryBuilder.setOrderIsUnique();
      },
      PRIMARY_KEY_ASC(queryBuilder) {
        organizationUniques[0].attributes.forEach(attributeName => {
          queryBuilder.orderBy({
            attribute: attributeName,
            direction: "ASC"
          });
        });
        queryBuilder.setOrderIsUnique();
      },
      PRIMARY_KEY_DESC(queryBuilder) {
        organizationUniques[0].attributes.forEach(attributeName => {
          queryBuilder.orderBy({
            attribute: attributeName,
            direction: "DESC"
          });
        });
        queryBuilder.setOrderIsUnique();
      },
      REPOSITORIES_COUNT_ASC($select) {
        pgAggregatesApplyOrderByTotalCount("ASC", relation16, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORIES_COUNT_DESC($select) {
        pgAggregatesApplyOrderByTotalCount("DESC", relation16, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORIES_DISTINCT_COUNT_CREATED_AT_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repository.attributes.created_at, "created_at", "ASC", relation16, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORIES_DISTINCT_COUNT_CREATED_AT_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repository.attributes.created_at, "created_at", "DESC", relation16, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORIES_DISTINCT_COUNT_DEFAULT_BRANCH_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repository.attributes.default_branch, "default_branch", "ASC", relation16, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORIES_DISTINCT_COUNT_DEFAULT_BRANCH_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repository.attributes.default_branch, "default_branch", "DESC", relation16, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORIES_DISTINCT_COUNT_DESCRIPTION_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repository.attributes.description, "description", "ASC", relation16, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORIES_DISTINCT_COUNT_DESCRIPTION_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repository.attributes.description, "description", "DESC", relation16, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORIES_DISTINCT_COUNT_NAME_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repository.attributes.name, "name", "ASC", relation16, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORIES_DISTINCT_COUNT_NAME_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repository.attributes.name, "name", "DESC", relation16, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORIES_DISTINCT_COUNT_ORGANIZATION_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repository.attributes.organization_id, "organization_id", "ASC", relation16, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORIES_DISTINCT_COUNT_ORGANIZATION_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repository.attributes.organization_id, "organization_id", "DESC", relation16, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORIES_DISTINCT_COUNT_OWNER_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repository.attributes.owner_id, "owner_id", "ASC", relation16, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORIES_DISTINCT_COUNT_OWNER_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repository.attributes.owner_id, "owner_id", "DESC", relation16, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORIES_DISTINCT_COUNT_ROW_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repository.attributes.id, "id", "ASC", relation16, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORIES_DISTINCT_COUNT_ROW_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repository.attributes.id, "id", "DESC", relation16, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORIES_DISTINCT_COUNT_SLUG_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repository.attributes.slug, "slug", "ASC", relation16, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORIES_DISTINCT_COUNT_SLUG_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repository.attributes.slug, "slug", "DESC", relation16, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORIES_DISTINCT_COUNT_UPDATED_AT_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repository.attributes.updated_at, "updated_at", "ASC", relation16, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORIES_DISTINCT_COUNT_UPDATED_AT_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repository.attributes.updated_at, "updated_at", "DESC", relation16, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORIES_DISTINCT_COUNT_VISIBILITY_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repository.attributes.visibility, "visibility", "ASC", relation16, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORIES_DISTINCT_COUNT_VISIBILITY_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repository.attributes.visibility, "visibility", "DESC", relation16, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORY_RELATIONSHIP_TYPES_COUNT_ASC($select) {
        pgAggregatesApplyOrderByTotalCount("ASC", relation17, spec_resource_repository_relationship_typePgResource, $select);
      },
      REPOSITORY_RELATIONSHIP_TYPES_COUNT_DESC($select) {
        pgAggregatesApplyOrderByTotalCount("DESC", relation17, spec_resource_repository_relationship_typePgResource, $select);
      },
      REPOSITORY_RELATIONSHIP_TYPES_DISTINCT_COUNT_CREATED_AT_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationshipType.attributes.created_at, "created_at", "ASC", relation17, spec_resource_repository_relationship_typePgResource, $select);
      },
      REPOSITORY_RELATIONSHIP_TYPES_DISTINCT_COUNT_CREATED_AT_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationshipType.attributes.created_at, "created_at", "DESC", relation17, spec_resource_repository_relationship_typePgResource, $select);
      },
      REPOSITORY_RELATIONSHIP_TYPES_DISTINCT_COUNT_DESCRIPTION_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationshipType.attributes.description, "description", "ASC", relation17, spec_resource_repository_relationship_typePgResource, $select);
      },
      REPOSITORY_RELATIONSHIP_TYPES_DISTINCT_COUNT_DESCRIPTION_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationshipType.attributes.description, "description", "DESC", relation17, spec_resource_repository_relationship_typePgResource, $select);
      },
      REPOSITORY_RELATIONSHIP_TYPES_DISTINCT_COUNT_IS_DIRECTED_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationshipType.attributes.is_directed, "is_directed", "ASC", relation17, spec_resource_repository_relationship_typePgResource, $select);
      },
      REPOSITORY_RELATIONSHIP_TYPES_DISTINCT_COUNT_IS_DIRECTED_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationshipType.attributes.is_directed, "is_directed", "DESC", relation17, spec_resource_repository_relationship_typePgResource, $select);
      },
      REPOSITORY_RELATIONSHIP_TYPES_DISTINCT_COUNT_NAME_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationshipType.attributes.name, "name", "ASC", relation17, spec_resource_repository_relationship_typePgResource, $select);
      },
      REPOSITORY_RELATIONSHIP_TYPES_DISTINCT_COUNT_NAME_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationshipType.attributes.name, "name", "DESC", relation17, spec_resource_repository_relationship_typePgResource, $select);
      },
      REPOSITORY_RELATIONSHIP_TYPES_DISTINCT_COUNT_ORGANIZATION_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationshipType.attributes.organization_id, "organization_id", "ASC", relation17, spec_resource_repository_relationship_typePgResource, $select);
      },
      REPOSITORY_RELATIONSHIP_TYPES_DISTINCT_COUNT_ORGANIZATION_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationshipType.attributes.organization_id, "organization_id", "DESC", relation17, spec_resource_repository_relationship_typePgResource, $select);
      },
      REPOSITORY_RELATIONSHIP_TYPES_DISTINCT_COUNT_ROW_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationshipType.attributes.id, "id", "ASC", relation17, spec_resource_repository_relationship_typePgResource, $select);
      },
      REPOSITORY_RELATIONSHIP_TYPES_DISTINCT_COUNT_ROW_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationshipType.attributes.id, "id", "DESC", relation17, spec_resource_repository_relationship_typePgResource, $select);
      },
      ROW_ID_ASC: RepositoryOrderBy_ROW_ID_ASCApply,
      ROW_ID_DESC: RepositoryOrderBy_ROW_ID_DESCApply,
      SUBSCRIPTION_ID_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "subscription_id",
          direction: "ASC"
        });
      },
      SUBSCRIPTION_ID_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "subscription_id",
          direction: "DESC"
        });
      },
      UPDATED_AT_ASC: RepositoryOrderBy_UPDATED_AT_ASCApply,
      UPDATED_AT_DESC: RepositoryOrderBy_UPDATED_AT_DESCApply
    }
  },
  PullRequestCommentGroupBy: {
    values: {
      AUTHOR_ID: PullRequestCommentGroupBy_AUTHOR_IDApply,
      BODY: PullRequestReviewGroupBy_BODYApply,
      COMMIT_SHA($pgSelect) {
        applyGroupByAttribute("commit_sha", TYPES.text, $pgSelect);
      },
      CREATED_AT: RepositoryCollaboratorGroupBy_CREATED_ATApply,
      CREATED_AT_TRUNCATED_TO_DAY: RepositoryCollaboratorGroupBy_CREATED_AT_TRUNCATED_TO_DAYApply,
      CREATED_AT_TRUNCATED_TO_HOUR: RepositoryCollaboratorGroupBy_CREATED_AT_TRUNCATED_TO_HOURApply,
      LINE($pgSelect) {
        applyGroupByAttribute("line", TYPES.int, $pgSelect);
      },
      PATH($pgSelect) {
        applyGroupByAttribute("path", TYPES.text, $pgSelect);
      },
      PULL_REQUEST_ID: PullRequestReviewGroupBy_PULL_REQUEST_IDApply,
      REPLY_TO_ID($pgSelect) {
        applyGroupByAttribute("reply_to_id", TYPES.uuid, $pgSelect);
      },
      SIDE($pgSelect) {
        applyGroupByAttribute("side", TYPES.text, $pgSelect);
      },
      UPDATED_AT: RepositoryCollaboratorGroupBy_UPDATED_ATApply,
      UPDATED_AT_TRUNCATED_TO_DAY: RepositoryCollaboratorGroupBy_UPDATED_AT_TRUNCATED_TO_DAYApply,
      UPDATED_AT_TRUNCATED_TO_HOUR: RepositoryCollaboratorGroupBy_UPDATED_AT_TRUNCATED_TO_HOURApply
    }
  },
  PullRequestCommentOrderBy: {
    values: {
      AUTHOR_ID_ASC: PullRequestCommentOrderBy_AUTHOR_ID_ASCApply,
      AUTHOR_ID_DESC: PullRequestCommentOrderBy_AUTHOR_ID_DESCApply,
      BODY_ASC: PullRequestCommentOrderBy_BODY_ASCApply,
      BODY_DESC: PullRequestCommentOrderBy_BODY_DESCApply,
      COMMIT_SHA_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "commit_sha",
          direction: "ASC"
        });
      },
      COMMIT_SHA_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "commit_sha",
          direction: "DESC"
        });
      },
      CREATED_AT_ASC: RepositoryOrderBy_CREATED_AT_ASCApply,
      CREATED_AT_DESC: RepositoryOrderBy_CREATED_AT_DESCApply,
      LINE_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "line",
          direction: "ASC"
        });
      },
      LINE_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "line",
          direction: "DESC"
        });
      },
      PATH_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "path",
          direction: "ASC"
        });
      },
      PATH_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "path",
          direction: "DESC"
        });
      },
      PRIMARY_KEY_ASC(queryBuilder) {
        pull_request_commentUniques[0].attributes.forEach(attributeName => {
          queryBuilder.orderBy({
            attribute: attributeName,
            direction: "ASC"
          });
        });
        queryBuilder.setOrderIsUnique();
      },
      PRIMARY_KEY_DESC(queryBuilder) {
        pull_request_commentUniques[0].attributes.forEach(attributeName => {
          queryBuilder.orderBy({
            attribute: attributeName,
            direction: "DESC"
          });
        });
        queryBuilder.setOrderIsUnique();
      },
      PULL_REQUEST_ID_ASC: PullRequestCommentOrderBy_PULL_REQUEST_ID_ASCApply,
      PULL_REQUEST_ID_DESC: PullRequestCommentOrderBy_PULL_REQUEST_ID_DESCApply,
      REPLY_TO_ID_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "reply_to_id",
          direction: "ASC"
        });
      },
      REPLY_TO_ID_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "reply_to_id",
          direction: "DESC"
        });
      },
      ROW_ID_ASC: RepositoryOrderBy_ROW_ID_ASCApply,
      ROW_ID_DESC: RepositoryOrderBy_ROW_ID_DESCApply,
      SIDE_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "side",
          direction: "ASC"
        });
      },
      SIDE_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "side",
          direction: "DESC"
        });
      },
      UPDATED_AT_ASC: RepositoryOrderBy_UPDATED_AT_ASCApply,
      UPDATED_AT_DESC: RepositoryOrderBy_UPDATED_AT_DESCApply
    }
  },
  PullRequestGroupBy: {
    values: {
      AUTHOR_ID: PullRequestCommentGroupBy_AUTHOR_IDApply,
      CLOSED_AT($pgSelect) {
        applyGroupByAttribute("closed_at", TYPES.timestamp, $pgSelect);
      },
      CLOSED_AT_TRUNCATED_TO_DAY(qb) {
        applyGroupByAggregateSpec(pgAggregateGroupBySpec_truncated_to_day, "closed_at", TYPES.timestamp, qb);
      },
      CLOSED_AT_TRUNCATED_TO_HOUR(qb) {
        applyGroupByAggregateSpec(pgAggregateGroupBySpec_truncated_to_hour, "closed_at", TYPES.timestamp, qb);
      },
      CREATED_AT: RepositoryCollaboratorGroupBy_CREATED_ATApply,
      CREATED_AT_TRUNCATED_TO_DAY: RepositoryCollaboratorGroupBy_CREATED_AT_TRUNCATED_TO_DAYApply,
      CREATED_AT_TRUNCATED_TO_HOUR: RepositoryCollaboratorGroupBy_CREATED_AT_TRUNCATED_TO_HOURApply,
      DESCRIPTION: PullRequestGroupBy_DESCRIPTIONApply,
      MERGE_COMMIT_SHA($pgSelect) {
        applyGroupByAttribute("merge_commit_sha", TYPES.text, $pgSelect);
      },
      MERGED_AT($pgSelect) {
        applyGroupByAttribute("merged_at", TYPES.timestamp, $pgSelect);
      },
      MERGED_AT_TRUNCATED_TO_DAY(qb) {
        applyGroupByAggregateSpec(pgAggregateGroupBySpec_truncated_to_day, "merged_at", TYPES.timestamp, qb);
      },
      MERGED_AT_TRUNCATED_TO_HOUR(qb) {
        applyGroupByAggregateSpec(pgAggregateGroupBySpec_truncated_to_hour, "merged_at", TYPES.timestamp, qb);
      },
      MERGED_BY_ID($pgSelect) {
        applyGroupByAttribute("merged_by_id", TYPES.uuid, $pgSelect);
      },
      NUMBER($pgSelect) {
        applyGroupByAttribute("number", TYPES.int, $pgSelect);
      },
      REPOSITORY_ID: RepositoryCollaboratorGroupBy_REPOSITORY_IDApply,
      SOURCE_BRANCH($pgSelect) {
        applyGroupByAttribute("source_branch", TYPES.text, $pgSelect);
      },
      STATE: PullRequestReviewGroupBy_STATEApply,
      TARGET_BRANCH($pgSelect) {
        applyGroupByAttribute("target_branch", TYPES.text, $pgSelect);
      },
      TITLE($pgSelect) {
        applyGroupByAttribute("title", TYPES.text, $pgSelect);
      },
      UPDATED_AT: RepositoryCollaboratorGroupBy_UPDATED_ATApply,
      UPDATED_AT_TRUNCATED_TO_DAY: RepositoryCollaboratorGroupBy_UPDATED_AT_TRUNCATED_TO_DAYApply,
      UPDATED_AT_TRUNCATED_TO_HOUR: RepositoryCollaboratorGroupBy_UPDATED_AT_TRUNCATED_TO_HOURApply
    }
  },
  PullRequestOrderBy: {
    values: {
      AUTHOR_ID_ASC: PullRequestCommentOrderBy_AUTHOR_ID_ASCApply,
      AUTHOR_ID_DESC: PullRequestCommentOrderBy_AUTHOR_ID_DESCApply,
      CLOSED_AT_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "closed_at",
          direction: "ASC"
        });
      },
      CLOSED_AT_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "closed_at",
          direction: "DESC"
        });
      },
      CREATED_AT_ASC: RepositoryOrderBy_CREATED_AT_ASCApply,
      CREATED_AT_DESC: RepositoryOrderBy_CREATED_AT_DESCApply,
      DESCRIPTION_ASC: RepositoryOrderBy_DESCRIPTION_ASCApply,
      DESCRIPTION_DESC: RepositoryOrderBy_DESCRIPTION_DESCApply,
      MERGE_COMMIT_SHA_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "merge_commit_sha",
          direction: "ASC"
        });
      },
      MERGE_COMMIT_SHA_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "merge_commit_sha",
          direction: "DESC"
        });
      },
      MERGED_AT_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "merged_at",
          direction: "ASC"
        });
      },
      MERGED_AT_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "merged_at",
          direction: "DESC"
        });
      },
      MERGED_BY_ID_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "merged_by_id",
          direction: "ASC"
        });
      },
      MERGED_BY_ID_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "merged_by_id",
          direction: "DESC"
        });
      },
      NUMBER_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "number",
          direction: "ASC"
        });
      },
      NUMBER_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "number",
          direction: "DESC"
        });
      },
      PRIMARY_KEY_ASC(queryBuilder) {
        pull_requestUniques[0].attributes.forEach(attributeName => {
          queryBuilder.orderBy({
            attribute: attributeName,
            direction: "ASC"
          });
        });
        queryBuilder.setOrderIsUnique();
      },
      PRIMARY_KEY_DESC(queryBuilder) {
        pull_requestUniques[0].attributes.forEach(attributeName => {
          queryBuilder.orderBy({
            attribute: attributeName,
            direction: "DESC"
          });
        });
        queryBuilder.setOrderIsUnique();
      },
      PULL_REQUEST_COMMENTS_AVERAGE_LINE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_average, spec_pullRequestComment.attributes.line, "line", "ASC", relation6, spec_resource_pull_request_commentPgResource, $select);
      },
      PULL_REQUEST_COMMENTS_AVERAGE_LINE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_average, spec_pullRequestComment.attributes.line, "line", "DESC", relation6, spec_resource_pull_request_commentPgResource, $select);
      },
      PULL_REQUEST_COMMENTS_COUNT_ASC($select) {
        pgAggregatesApplyOrderByTotalCount("ASC", relation6, spec_resource_pull_request_commentPgResource, $select);
      },
      PULL_REQUEST_COMMENTS_COUNT_DESC($select) {
        pgAggregatesApplyOrderByTotalCount("DESC", relation6, spec_resource_pull_request_commentPgResource, $select);
      },
      PULL_REQUEST_COMMENTS_DISTINCT_COUNT_AUTHOR_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.author_id, "author_id", "ASC", relation6, spec_resource_pull_request_commentPgResource, $select);
      },
      PULL_REQUEST_COMMENTS_DISTINCT_COUNT_AUTHOR_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.author_id, "author_id", "DESC", relation6, spec_resource_pull_request_commentPgResource, $select);
      },
      PULL_REQUEST_COMMENTS_DISTINCT_COUNT_BODY_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.body, "body", "ASC", relation6, spec_resource_pull_request_commentPgResource, $select);
      },
      PULL_REQUEST_COMMENTS_DISTINCT_COUNT_BODY_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.body, "body", "DESC", relation6, spec_resource_pull_request_commentPgResource, $select);
      },
      PULL_REQUEST_COMMENTS_DISTINCT_COUNT_COMMIT_SHA_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.commit_sha, "commit_sha", "ASC", relation6, spec_resource_pull_request_commentPgResource, $select);
      },
      PULL_REQUEST_COMMENTS_DISTINCT_COUNT_COMMIT_SHA_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.commit_sha, "commit_sha", "DESC", relation6, spec_resource_pull_request_commentPgResource, $select);
      },
      PULL_REQUEST_COMMENTS_DISTINCT_COUNT_CREATED_AT_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.created_at, "created_at", "ASC", relation6, spec_resource_pull_request_commentPgResource, $select);
      },
      PULL_REQUEST_COMMENTS_DISTINCT_COUNT_CREATED_AT_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.created_at, "created_at", "DESC", relation6, spec_resource_pull_request_commentPgResource, $select);
      },
      PULL_REQUEST_COMMENTS_DISTINCT_COUNT_LINE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.line, "line", "ASC", relation6, spec_resource_pull_request_commentPgResource, $select);
      },
      PULL_REQUEST_COMMENTS_DISTINCT_COUNT_LINE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.line, "line", "DESC", relation6, spec_resource_pull_request_commentPgResource, $select);
      },
      PULL_REQUEST_COMMENTS_DISTINCT_COUNT_PATH_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.path, "path", "ASC", relation6, spec_resource_pull_request_commentPgResource, $select);
      },
      PULL_REQUEST_COMMENTS_DISTINCT_COUNT_PATH_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.path, "path", "DESC", relation6, spec_resource_pull_request_commentPgResource, $select);
      },
      PULL_REQUEST_COMMENTS_DISTINCT_COUNT_PULL_REQUEST_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.pull_request_id, "pull_request_id", "ASC", relation6, spec_resource_pull_request_commentPgResource, $select);
      },
      PULL_REQUEST_COMMENTS_DISTINCT_COUNT_PULL_REQUEST_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.pull_request_id, "pull_request_id", "DESC", relation6, spec_resource_pull_request_commentPgResource, $select);
      },
      PULL_REQUEST_COMMENTS_DISTINCT_COUNT_REPLY_TO_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.reply_to_id, "reply_to_id", "ASC", relation6, spec_resource_pull_request_commentPgResource, $select);
      },
      PULL_REQUEST_COMMENTS_DISTINCT_COUNT_REPLY_TO_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.reply_to_id, "reply_to_id", "DESC", relation6, spec_resource_pull_request_commentPgResource, $select);
      },
      PULL_REQUEST_COMMENTS_DISTINCT_COUNT_ROW_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.id, "id", "ASC", relation6, spec_resource_pull_request_commentPgResource, $select);
      },
      PULL_REQUEST_COMMENTS_DISTINCT_COUNT_ROW_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.id, "id", "DESC", relation6, spec_resource_pull_request_commentPgResource, $select);
      },
      PULL_REQUEST_COMMENTS_DISTINCT_COUNT_SIDE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.side, "side", "ASC", relation6, spec_resource_pull_request_commentPgResource, $select);
      },
      PULL_REQUEST_COMMENTS_DISTINCT_COUNT_SIDE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.side, "side", "DESC", relation6, spec_resource_pull_request_commentPgResource, $select);
      },
      PULL_REQUEST_COMMENTS_DISTINCT_COUNT_UPDATED_AT_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.updated_at, "updated_at", "ASC", relation6, spec_resource_pull_request_commentPgResource, $select);
      },
      PULL_REQUEST_COMMENTS_DISTINCT_COUNT_UPDATED_AT_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.updated_at, "updated_at", "DESC", relation6, spec_resource_pull_request_commentPgResource, $select);
      },
      PULL_REQUEST_COMMENTS_MAX_LINE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_max, spec_pullRequestComment.attributes.line, "line", "ASC", relation6, spec_resource_pull_request_commentPgResource, $select);
      },
      PULL_REQUEST_COMMENTS_MAX_LINE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_max, spec_pullRequestComment.attributes.line, "line", "DESC", relation6, spec_resource_pull_request_commentPgResource, $select);
      },
      PULL_REQUEST_COMMENTS_MIN_LINE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_min, spec_pullRequestComment.attributes.line, "line", "ASC", relation6, spec_resource_pull_request_commentPgResource, $select);
      },
      PULL_REQUEST_COMMENTS_MIN_LINE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_min, spec_pullRequestComment.attributes.line, "line", "DESC", relation6, spec_resource_pull_request_commentPgResource, $select);
      },
      PULL_REQUEST_COMMENTS_STDDEV_POPULATION_LINE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_stddevPopulation, spec_pullRequestComment.attributes.line, "line", "ASC", relation6, spec_resource_pull_request_commentPgResource, $select);
      },
      PULL_REQUEST_COMMENTS_STDDEV_POPULATION_LINE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_stddevPopulation, spec_pullRequestComment.attributes.line, "line", "DESC", relation6, spec_resource_pull_request_commentPgResource, $select);
      },
      PULL_REQUEST_COMMENTS_STDDEV_SAMPLE_LINE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_stddevSample, spec_pullRequestComment.attributes.line, "line", "ASC", relation6, spec_resource_pull_request_commentPgResource, $select);
      },
      PULL_REQUEST_COMMENTS_STDDEV_SAMPLE_LINE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_stddevSample, spec_pullRequestComment.attributes.line, "line", "DESC", relation6, spec_resource_pull_request_commentPgResource, $select);
      },
      PULL_REQUEST_COMMENTS_SUM_LINE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_sum, spec_pullRequestComment.attributes.line, "line", "ASC", relation6, spec_resource_pull_request_commentPgResource, $select);
      },
      PULL_REQUEST_COMMENTS_SUM_LINE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_sum, spec_pullRequestComment.attributes.line, "line", "DESC", relation6, spec_resource_pull_request_commentPgResource, $select);
      },
      PULL_REQUEST_COMMENTS_VARIANCE_POPULATION_LINE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_variancePopulation, spec_pullRequestComment.attributes.line, "line", "ASC", relation6, spec_resource_pull_request_commentPgResource, $select);
      },
      PULL_REQUEST_COMMENTS_VARIANCE_POPULATION_LINE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_variancePopulation, spec_pullRequestComment.attributes.line, "line", "DESC", relation6, spec_resource_pull_request_commentPgResource, $select);
      },
      PULL_REQUEST_COMMENTS_VARIANCE_SAMPLE_LINE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_varianceSample, spec_pullRequestComment.attributes.line, "line", "ASC", relation6, spec_resource_pull_request_commentPgResource, $select);
      },
      PULL_REQUEST_COMMENTS_VARIANCE_SAMPLE_LINE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_varianceSample, spec_pullRequestComment.attributes.line, "line", "DESC", relation6, spec_resource_pull_request_commentPgResource, $select);
      },
      PULL_REQUEST_REVIEWS_COUNT_ASC($select) {
        pgAggregatesApplyOrderByTotalCount("ASC", relation7, spec_resource_pull_request_reviewPgResource, $select);
      },
      PULL_REQUEST_REVIEWS_COUNT_DESC($select) {
        pgAggregatesApplyOrderByTotalCount("DESC", relation7, spec_resource_pull_request_reviewPgResource, $select);
      },
      PULL_REQUEST_REVIEWS_DISTINCT_COUNT_BODY_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestReview.attributes.body, "body", "ASC", relation7, spec_resource_pull_request_reviewPgResource, $select);
      },
      PULL_REQUEST_REVIEWS_DISTINCT_COUNT_BODY_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestReview.attributes.body, "body", "DESC", relation7, spec_resource_pull_request_reviewPgResource, $select);
      },
      PULL_REQUEST_REVIEWS_DISTINCT_COUNT_CREATED_AT_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestReview.attributes.created_at, "created_at", "ASC", relation7, spec_resource_pull_request_reviewPgResource, $select);
      },
      PULL_REQUEST_REVIEWS_DISTINCT_COUNT_CREATED_AT_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestReview.attributes.created_at, "created_at", "DESC", relation7, spec_resource_pull_request_reviewPgResource, $select);
      },
      PULL_REQUEST_REVIEWS_DISTINCT_COUNT_PULL_REQUEST_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestReview.attributes.pull_request_id, "pull_request_id", "ASC", relation7, spec_resource_pull_request_reviewPgResource, $select);
      },
      PULL_REQUEST_REVIEWS_DISTINCT_COUNT_PULL_REQUEST_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestReview.attributes.pull_request_id, "pull_request_id", "DESC", relation7, spec_resource_pull_request_reviewPgResource, $select);
      },
      PULL_REQUEST_REVIEWS_DISTINCT_COUNT_REVIEWER_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestReview.attributes.reviewer_id, "reviewer_id", "ASC", relation7, spec_resource_pull_request_reviewPgResource, $select);
      },
      PULL_REQUEST_REVIEWS_DISTINCT_COUNT_REVIEWER_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestReview.attributes.reviewer_id, "reviewer_id", "DESC", relation7, spec_resource_pull_request_reviewPgResource, $select);
      },
      PULL_REQUEST_REVIEWS_DISTINCT_COUNT_ROW_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestReview.attributes.id, "id", "ASC", relation7, spec_resource_pull_request_reviewPgResource, $select);
      },
      PULL_REQUEST_REVIEWS_DISTINCT_COUNT_ROW_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestReview.attributes.id, "id", "DESC", relation7, spec_resource_pull_request_reviewPgResource, $select);
      },
      PULL_REQUEST_REVIEWS_DISTINCT_COUNT_STATE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestReview.attributes.state, "state", "ASC", relation7, spec_resource_pull_request_reviewPgResource, $select);
      },
      PULL_REQUEST_REVIEWS_DISTINCT_COUNT_STATE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestReview.attributes.state, "state", "DESC", relation7, spec_resource_pull_request_reviewPgResource, $select);
      },
      PULL_REQUEST_REVIEWS_DISTINCT_COUNT_SUBMITTED_AT_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestReview.attributes.submitted_at, "submitted_at", "ASC", relation7, spec_resource_pull_request_reviewPgResource, $select);
      },
      PULL_REQUEST_REVIEWS_DISTINCT_COUNT_SUBMITTED_AT_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestReview.attributes.submitted_at, "submitted_at", "DESC", relation7, spec_resource_pull_request_reviewPgResource, $select);
      },
      PULL_REQUEST_REVIEWS_DISTINCT_COUNT_UPDATED_AT_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestReview.attributes.updated_at, "updated_at", "ASC", relation7, spec_resource_pull_request_reviewPgResource, $select);
      },
      PULL_REQUEST_REVIEWS_DISTINCT_COUNT_UPDATED_AT_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestReview.attributes.updated_at, "updated_at", "DESC", relation7, spec_resource_pull_request_reviewPgResource, $select);
      },
      REPOSITORY_ID_ASC: PullRequestOrderBy_REPOSITORY_ID_ASCApply,
      REPOSITORY_ID_DESC: PullRequestOrderBy_REPOSITORY_ID_DESCApply,
      ROW_ID_ASC: RepositoryOrderBy_ROW_ID_ASCApply,
      ROW_ID_DESC: RepositoryOrderBy_ROW_ID_DESCApply,
      SOURCE_BRANCH_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "source_branch",
          direction: "ASC"
        });
      },
      SOURCE_BRANCH_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "source_branch",
          direction: "DESC"
        });
      },
      STATE_ASC: PullRequestReviewOrderBy_STATE_ASCApply,
      STATE_DESC: PullRequestReviewOrderBy_STATE_DESCApply,
      TARGET_BRANCH_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "target_branch",
          direction: "ASC"
        });
      },
      TARGET_BRANCH_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "target_branch",
          direction: "DESC"
        });
      },
      TITLE_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "title",
          direction: "ASC"
        });
      },
      TITLE_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "title",
          direction: "DESC"
        });
      },
      UPDATED_AT_ASC: RepositoryOrderBy_UPDATED_AT_ASCApply,
      UPDATED_AT_DESC: RepositoryOrderBy_UPDATED_AT_DESCApply
    }
  },
  PullRequestReviewGroupBy: {
    values: {
      BODY: PullRequestReviewGroupBy_BODYApply,
      CREATED_AT: RepositoryCollaboratorGroupBy_CREATED_ATApply,
      CREATED_AT_TRUNCATED_TO_DAY: RepositoryCollaboratorGroupBy_CREATED_AT_TRUNCATED_TO_DAYApply,
      CREATED_AT_TRUNCATED_TO_HOUR: RepositoryCollaboratorGroupBy_CREATED_AT_TRUNCATED_TO_HOURApply,
      PULL_REQUEST_ID: PullRequestReviewGroupBy_PULL_REQUEST_IDApply,
      REVIEWER_ID($pgSelect) {
        applyGroupByAttribute("reviewer_id", TYPES.uuid, $pgSelect);
      },
      STATE: PullRequestReviewGroupBy_STATEApply,
      SUBMITTED_AT($pgSelect) {
        applyGroupByAttribute("submitted_at", TYPES.timestamp, $pgSelect);
      },
      SUBMITTED_AT_TRUNCATED_TO_DAY(qb) {
        applyGroupByAggregateSpec(pgAggregateGroupBySpec_truncated_to_day, "submitted_at", TYPES.timestamp, qb);
      },
      SUBMITTED_AT_TRUNCATED_TO_HOUR(qb) {
        applyGroupByAggregateSpec(pgAggregateGroupBySpec_truncated_to_hour, "submitted_at", TYPES.timestamp, qb);
      },
      UPDATED_AT: RepositoryCollaboratorGroupBy_UPDATED_ATApply,
      UPDATED_AT_TRUNCATED_TO_DAY: RepositoryCollaboratorGroupBy_UPDATED_AT_TRUNCATED_TO_DAYApply,
      UPDATED_AT_TRUNCATED_TO_HOUR: RepositoryCollaboratorGroupBy_UPDATED_AT_TRUNCATED_TO_HOURApply
    }
  },
  PullRequestReviewOrderBy: {
    values: {
      BODY_ASC: PullRequestCommentOrderBy_BODY_ASCApply,
      BODY_DESC: PullRequestCommentOrderBy_BODY_DESCApply,
      CREATED_AT_ASC: RepositoryOrderBy_CREATED_AT_ASCApply,
      CREATED_AT_DESC: RepositoryOrderBy_CREATED_AT_DESCApply,
      PRIMARY_KEY_ASC(queryBuilder) {
        pull_request_reviewUniques[0].attributes.forEach(attributeName => {
          queryBuilder.orderBy({
            attribute: attributeName,
            direction: "ASC"
          });
        });
        queryBuilder.setOrderIsUnique();
      },
      PRIMARY_KEY_DESC(queryBuilder) {
        pull_request_reviewUniques[0].attributes.forEach(attributeName => {
          queryBuilder.orderBy({
            attribute: attributeName,
            direction: "DESC"
          });
        });
        queryBuilder.setOrderIsUnique();
      },
      PULL_REQUEST_ID_ASC: PullRequestCommentOrderBy_PULL_REQUEST_ID_ASCApply,
      PULL_REQUEST_ID_DESC: PullRequestCommentOrderBy_PULL_REQUEST_ID_DESCApply,
      REVIEWER_ID_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "reviewer_id",
          direction: "ASC"
        });
      },
      REVIEWER_ID_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "reviewer_id",
          direction: "DESC"
        });
      },
      ROW_ID_ASC: RepositoryOrderBy_ROW_ID_ASCApply,
      ROW_ID_DESC: RepositoryOrderBy_ROW_ID_DESCApply,
      STATE_ASC: PullRequestReviewOrderBy_STATE_ASCApply,
      STATE_DESC: PullRequestReviewOrderBy_STATE_DESCApply,
      SUBMITTED_AT_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "submitted_at",
          direction: "ASC"
        });
      },
      SUBMITTED_AT_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "submitted_at",
          direction: "DESC"
        });
      },
      UPDATED_AT_ASC: RepositoryOrderBy_UPDATED_AT_ASCApply,
      UPDATED_AT_DESC: RepositoryOrderBy_UPDATED_AT_DESCApply
    }
  },
  RepositoryCollaboratorGroupBy: {
    values: {
      CREATED_AT: RepositoryCollaboratorGroupBy_CREATED_ATApply,
      CREATED_AT_TRUNCATED_TO_DAY: RepositoryCollaboratorGroupBy_CREATED_AT_TRUNCATED_TO_DAYApply,
      CREATED_AT_TRUNCATED_TO_HOUR: RepositoryCollaboratorGroupBy_CREATED_AT_TRUNCATED_TO_HOURApply,
      PERMISSION($pgSelect) {
        applyGroupByAttribute("permission", permissionCodec, $pgSelect);
      },
      REPOSITORY_ID: RepositoryCollaboratorGroupBy_REPOSITORY_IDApply,
      UPDATED_AT: RepositoryCollaboratorGroupBy_UPDATED_ATApply,
      UPDATED_AT_TRUNCATED_TO_DAY: RepositoryCollaboratorGroupBy_UPDATED_AT_TRUNCATED_TO_DAYApply,
      UPDATED_AT_TRUNCATED_TO_HOUR: RepositoryCollaboratorGroupBy_UPDATED_AT_TRUNCATED_TO_HOURApply,
      USER_ID($pgSelect) {
        applyGroupByAttribute("user_id", TYPES.uuid, $pgSelect);
      }
    }
  },
  RepositoryCollaboratorOrderBy: {
    values: {
      CREATED_AT_ASC: RepositoryOrderBy_CREATED_AT_ASCApply,
      CREATED_AT_DESC: RepositoryOrderBy_CREATED_AT_DESCApply,
      PERMISSION_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "permission",
          direction: "ASC"
        });
      },
      PERMISSION_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "permission",
          direction: "DESC"
        });
      },
      PRIMARY_KEY_ASC(queryBuilder) {
        repository_collaboratorUniques[0].attributes.forEach(attributeName => {
          queryBuilder.orderBy({
            attribute: attributeName,
            direction: "ASC"
          });
        });
        queryBuilder.setOrderIsUnique();
      },
      PRIMARY_KEY_DESC(queryBuilder) {
        repository_collaboratorUniques[0].attributes.forEach(attributeName => {
          queryBuilder.orderBy({
            attribute: attributeName,
            direction: "DESC"
          });
        });
        queryBuilder.setOrderIsUnique();
      },
      REPOSITORY_ID_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "repository_id",
          direction: "ASC"
        });
        queryBuilder.setOrderIsUnique();
      },
      REPOSITORY_ID_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "repository_id",
          direction: "DESC"
        });
        queryBuilder.setOrderIsUnique();
      },
      UPDATED_AT_ASC: RepositoryOrderBy_UPDATED_AT_ASCApply,
      UPDATED_AT_DESC: RepositoryOrderBy_UPDATED_AT_DESCApply,
      USER_ID_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "user_id",
          direction: "ASC"
        });
      },
      USER_ID_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "user_id",
          direction: "DESC"
        });
      }
    }
  },
  RepositoryGroupBy: {
    values: {
      CREATED_AT: RepositoryCollaboratorGroupBy_CREATED_ATApply,
      CREATED_AT_TRUNCATED_TO_DAY: RepositoryCollaboratorGroupBy_CREATED_AT_TRUNCATED_TO_DAYApply,
      CREATED_AT_TRUNCATED_TO_HOUR: RepositoryCollaboratorGroupBy_CREATED_AT_TRUNCATED_TO_HOURApply,
      DEFAULT_BRANCH($pgSelect) {
        applyGroupByAttribute("default_branch", TYPES.text, $pgSelect);
      },
      DESCRIPTION: PullRequestGroupBy_DESCRIPTIONApply,
      NAME: RepositoryGroupBy_NAMEApply,
      ORGANIZATION_ID: RepositoryGroupBy_ORGANIZATION_IDApply,
      OWNER_ID($pgSelect) {
        applyGroupByAttribute("owner_id", TYPES.uuid, $pgSelect);
      },
      SLUG($pgSelect) {
        applyGroupByAttribute("slug", TYPES.text, $pgSelect);
      },
      UPDATED_AT: RepositoryCollaboratorGroupBy_UPDATED_ATApply,
      UPDATED_AT_TRUNCATED_TO_DAY: RepositoryCollaboratorGroupBy_UPDATED_AT_TRUNCATED_TO_DAYApply,
      UPDATED_AT_TRUNCATED_TO_HOUR: RepositoryCollaboratorGroupBy_UPDATED_AT_TRUNCATED_TO_HOURApply,
      VISIBILITY($pgSelect) {
        applyGroupByAttribute("visibility", visibilityCodec, $pgSelect);
      }
    }
  },
  RepositoryOrderBy: {
    values: {
      CREATED_AT_ASC: RepositoryOrderBy_CREATED_AT_ASCApply,
      CREATED_AT_DESC: RepositoryOrderBy_CREATED_AT_DESCApply,
      DEFAULT_BRANCH_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "default_branch",
          direction: "ASC"
        });
      },
      DEFAULT_BRANCH_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "default_branch",
          direction: "DESC"
        });
      },
      DESCRIPTION_ASC: RepositoryOrderBy_DESCRIPTION_ASCApply,
      DESCRIPTION_DESC: RepositoryOrderBy_DESCRIPTION_DESCApply,
      EXTERNAL_DEPENDENCIES_COUNT_ASC($select) {
        pgAggregatesApplyOrderByTotalCount("ASC", relation2, spec_resource_external_dependencyPgResource, $select);
      },
      EXTERNAL_DEPENDENCIES_COUNT_DESC($select) {
        pgAggregatesApplyOrderByTotalCount("DESC", relation2, spec_resource_external_dependencyPgResource, $select);
      },
      EXTERNAL_DEPENDENCIES_DISTINCT_COUNT_CREATED_AT_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_externalDependency.attributes.created_at, "created_at", "ASC", relation2, spec_resource_external_dependencyPgResource, $select);
      },
      EXTERNAL_DEPENDENCIES_DISTINCT_COUNT_CREATED_AT_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_externalDependency.attributes.created_at, "created_at", "DESC", relation2, spec_resource_external_dependencyPgResource, $select);
      },
      EXTERNAL_DEPENDENCIES_DISTINCT_COUNT_DETECTION_SOURCE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_externalDependency.attributes.detection_source, "detection_source", "ASC", relation2, spec_resource_external_dependencyPgResource, $select);
      },
      EXTERNAL_DEPENDENCIES_DISTINCT_COUNT_DETECTION_SOURCE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_externalDependency.attributes.detection_source, "detection_source", "DESC", relation2, spec_resource_external_dependencyPgResource, $select);
      },
      EXTERNAL_DEPENDENCIES_DISTINCT_COUNT_PACKAGE_MANAGER_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_externalDependency.attributes.package_manager, "package_manager", "ASC", relation2, spec_resource_external_dependencyPgResource, $select);
      },
      EXTERNAL_DEPENDENCIES_DISTINCT_COUNT_PACKAGE_MANAGER_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_externalDependency.attributes.package_manager, "package_manager", "DESC", relation2, spec_resource_external_dependencyPgResource, $select);
      },
      EXTERNAL_DEPENDENCIES_DISTINCT_COUNT_PACKAGE_NAME_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_externalDependency.attributes.package_name, "package_name", "ASC", relation2, spec_resource_external_dependencyPgResource, $select);
      },
      EXTERNAL_DEPENDENCIES_DISTINCT_COUNT_PACKAGE_NAME_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_externalDependency.attributes.package_name, "package_name", "DESC", relation2, spec_resource_external_dependencyPgResource, $select);
      },
      EXTERNAL_DEPENDENCIES_DISTINCT_COUNT_REPOSITORY_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_externalDependency.attributes.repository_id, "repository_id", "ASC", relation2, spec_resource_external_dependencyPgResource, $select);
      },
      EXTERNAL_DEPENDENCIES_DISTINCT_COUNT_REPOSITORY_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_externalDependency.attributes.repository_id, "repository_id", "DESC", relation2, spec_resource_external_dependencyPgResource, $select);
      },
      EXTERNAL_DEPENDENCIES_DISTINCT_COUNT_ROW_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_externalDependency.attributes.id, "id", "ASC", relation2, spec_resource_external_dependencyPgResource, $select);
      },
      EXTERNAL_DEPENDENCIES_DISTINCT_COUNT_ROW_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_externalDependency.attributes.id, "id", "DESC", relation2, spec_resource_external_dependencyPgResource, $select);
      },
      EXTERNAL_DEPENDENCIES_DISTINCT_COUNT_VERSION_CONSTRAINT_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_externalDependency.attributes.version_constraint, "version_constraint", "ASC", relation2, spec_resource_external_dependencyPgResource, $select);
      },
      EXTERNAL_DEPENDENCIES_DISTINCT_COUNT_VERSION_CONSTRAINT_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_externalDependency.attributes.version_constraint, "version_constraint", "DESC", relation2, spec_resource_external_dependencyPgResource, $select);
      },
      NAME_ASC: RepositoryOrderBy_NAME_ASCApply,
      NAME_DESC: RepositoryOrderBy_NAME_DESCApply,
      ORGANIZATION_ID_ASC: RepositoryOrderBy_ORGANIZATION_ID_ASCApply,
      ORGANIZATION_ID_DESC: RepositoryOrderBy_ORGANIZATION_ID_DESCApply,
      OWNER_ID_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "owner_id",
          direction: "ASC"
        });
      },
      OWNER_ID_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "owner_id",
          direction: "DESC"
        });
      },
      PRIMARY_KEY_ASC(queryBuilder) {
        repositoryUniques[0].attributes.forEach(attributeName => {
          queryBuilder.orderBy({
            attribute: attributeName,
            direction: "ASC"
          });
        });
        queryBuilder.setOrderIsUnique();
      },
      PRIMARY_KEY_DESC(queryBuilder) {
        repositoryUniques[0].attributes.forEach(attributeName => {
          queryBuilder.orderBy({
            attribute: attributeName,
            direction: "DESC"
          });
        });
        queryBuilder.setOrderIsUnique();
      },
      PULL_REQUESTS_AVERAGE_NUMBER_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_average, spec_pullRequest.attributes.number, "number", "ASC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_AVERAGE_NUMBER_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_average, spec_pullRequest.attributes.number, "number", "DESC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_COUNT_ASC($select) {
        pgAggregatesApplyOrderByTotalCount("ASC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_COUNT_DESC($select) {
        pgAggregatesApplyOrderByTotalCount("DESC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_DISTINCT_COUNT_AUTHOR_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.author_id, "author_id", "ASC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_DISTINCT_COUNT_AUTHOR_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.author_id, "author_id", "DESC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_DISTINCT_COUNT_CLOSED_AT_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.closed_at, "closed_at", "ASC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_DISTINCT_COUNT_CLOSED_AT_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.closed_at, "closed_at", "DESC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_DISTINCT_COUNT_CREATED_AT_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.created_at, "created_at", "ASC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_DISTINCT_COUNT_CREATED_AT_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.created_at, "created_at", "DESC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_DISTINCT_COUNT_DESCRIPTION_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.description, "description", "ASC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_DISTINCT_COUNT_DESCRIPTION_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.description, "description", "DESC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_DISTINCT_COUNT_MERGE_COMMIT_SHA_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.merge_commit_sha, "merge_commit_sha", "ASC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_DISTINCT_COUNT_MERGE_COMMIT_SHA_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.merge_commit_sha, "merge_commit_sha", "DESC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_DISTINCT_COUNT_MERGED_AT_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.merged_at, "merged_at", "ASC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_DISTINCT_COUNT_MERGED_AT_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.merged_at, "merged_at", "DESC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_DISTINCT_COUNT_MERGED_BY_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.merged_by_id, "merged_by_id", "ASC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_DISTINCT_COUNT_MERGED_BY_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.merged_by_id, "merged_by_id", "DESC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_DISTINCT_COUNT_NUMBER_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.number, "number", "ASC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_DISTINCT_COUNT_NUMBER_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.number, "number", "DESC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_DISTINCT_COUNT_REPOSITORY_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.repository_id, "repository_id", "ASC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_DISTINCT_COUNT_REPOSITORY_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.repository_id, "repository_id", "DESC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_DISTINCT_COUNT_ROW_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.id, "id", "ASC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_DISTINCT_COUNT_ROW_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.id, "id", "DESC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_DISTINCT_COUNT_SOURCE_BRANCH_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.source_branch, "source_branch", "ASC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_DISTINCT_COUNT_SOURCE_BRANCH_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.source_branch, "source_branch", "DESC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_DISTINCT_COUNT_STATE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.state, "state", "ASC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_DISTINCT_COUNT_STATE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.state, "state", "DESC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_DISTINCT_COUNT_TARGET_BRANCH_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.target_branch, "target_branch", "ASC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_DISTINCT_COUNT_TARGET_BRANCH_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.target_branch, "target_branch", "DESC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_DISTINCT_COUNT_TITLE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.title, "title", "ASC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_DISTINCT_COUNT_TITLE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.title, "title", "DESC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_DISTINCT_COUNT_UPDATED_AT_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.updated_at, "updated_at", "ASC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_DISTINCT_COUNT_UPDATED_AT_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.updated_at, "updated_at", "DESC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_MAX_NUMBER_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_max, spec_pullRequest.attributes.number, "number", "ASC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_MAX_NUMBER_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_max, spec_pullRequest.attributes.number, "number", "DESC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_MIN_NUMBER_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_min, spec_pullRequest.attributes.number, "number", "ASC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_MIN_NUMBER_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_min, spec_pullRequest.attributes.number, "number", "DESC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_STDDEV_POPULATION_NUMBER_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_stddevPopulation, spec_pullRequest.attributes.number, "number", "ASC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_STDDEV_POPULATION_NUMBER_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_stddevPopulation, spec_pullRequest.attributes.number, "number", "DESC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_STDDEV_SAMPLE_NUMBER_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_stddevSample, spec_pullRequest.attributes.number, "number", "ASC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_STDDEV_SAMPLE_NUMBER_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_stddevSample, spec_pullRequest.attributes.number, "number", "DESC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_SUM_NUMBER_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_sum, spec_pullRequest.attributes.number, "number", "ASC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_SUM_NUMBER_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_sum, spec_pullRequest.attributes.number, "number", "DESC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_VARIANCE_POPULATION_NUMBER_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_variancePopulation, spec_pullRequest.attributes.number, "number", "ASC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_VARIANCE_POPULATION_NUMBER_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_variancePopulation, spec_pullRequest.attributes.number, "number", "DESC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_VARIANCE_SAMPLE_NUMBER_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_varianceSample, spec_pullRequest.attributes.number, "number", "ASC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_VARIANCE_SAMPLE_NUMBER_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_varianceSample, spec_pullRequest.attributes.number, "number", "DESC", relation5, spec_resource_pull_requestPgResource, $select);
      },
      REPOSITORY_COLLABORATORS_COUNT_ASC($select) {
        pgAggregatesApplyOrderByTotalCount("ASC", relation, spec_resource_repository_collaboratorPgResource, $select);
      },
      REPOSITORY_COLLABORATORS_COUNT_DESC($select) {
        pgAggregatesApplyOrderByTotalCount("DESC", relation, spec_resource_repository_collaboratorPgResource, $select);
      },
      REPOSITORY_COLLABORATORS_DISTINCT_COUNT_CREATED_AT_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryCollaborator.attributes.created_at, "created_at", "ASC", relation, spec_resource_repository_collaboratorPgResource, $select);
      },
      REPOSITORY_COLLABORATORS_DISTINCT_COUNT_CREATED_AT_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryCollaborator.attributes.created_at, "created_at", "DESC", relation, spec_resource_repository_collaboratorPgResource, $select);
      },
      REPOSITORY_COLLABORATORS_DISTINCT_COUNT_PERMISSION_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryCollaborator.attributes.permission, "permission", "ASC", relation, spec_resource_repository_collaboratorPgResource, $select);
      },
      REPOSITORY_COLLABORATORS_DISTINCT_COUNT_PERMISSION_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryCollaborator.attributes.permission, "permission", "DESC", relation, spec_resource_repository_collaboratorPgResource, $select);
      },
      REPOSITORY_COLLABORATORS_DISTINCT_COUNT_REPOSITORY_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryCollaborator.attributes.repository_id, "repository_id", "ASC", relation, spec_resource_repository_collaboratorPgResource, $select);
      },
      REPOSITORY_COLLABORATORS_DISTINCT_COUNT_REPOSITORY_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryCollaborator.attributes.repository_id, "repository_id", "DESC", relation, spec_resource_repository_collaboratorPgResource, $select);
      },
      REPOSITORY_COLLABORATORS_DISTINCT_COUNT_UPDATED_AT_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryCollaborator.attributes.updated_at, "updated_at", "ASC", relation, spec_resource_repository_collaboratorPgResource, $select);
      },
      REPOSITORY_COLLABORATORS_DISTINCT_COUNT_UPDATED_AT_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryCollaborator.attributes.updated_at, "updated_at", "DESC", relation, spec_resource_repository_collaboratorPgResource, $select);
      },
      REPOSITORY_COLLABORATORS_DISTINCT_COUNT_USER_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryCollaborator.attributes.user_id, "user_id", "ASC", relation, spec_resource_repository_collaboratorPgResource, $select);
      },
      REPOSITORY_COLLABORATORS_DISTINCT_COUNT_USER_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryCollaborator.attributes.user_id, "user_id", "DESC", relation, spec_resource_repository_collaboratorPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_AVERAGE_CONFIDENCE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_average, spec_repositoryRelationship.attributes.confidence, "confidence", "ASC", relation3, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_AVERAGE_CONFIDENCE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_average, spec_repositoryRelationship.attributes.confidence, "confidence", "DESC", relation3, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_COUNT_ASC($select) {
        pgAggregatesApplyOrderByTotalCount("ASC", relation3, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_COUNT_DESC($select) {
        pgAggregatesApplyOrderByTotalCount("DESC", relation3, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_DISTINCT_COUNT_BRANCH_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.branch, "branch", "ASC", relation3, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_DISTINCT_COUNT_BRANCH_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.branch, "branch", "DESC", relation3, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_DISTINCT_COUNT_CONFIDENCE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.confidence, "confidence", "ASC", relation3, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_DISTINCT_COUNT_CONFIDENCE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.confidence, "confidence", "DESC", relation3, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_DISTINCT_COUNT_CREATED_AT_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.created_at, "created_at", "ASC", relation3, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_DISTINCT_COUNT_CREATED_AT_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.created_at, "created_at", "DESC", relation3, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_DISTINCT_COUNT_DETECTION_SOURCE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.detection_source, "detection_source", "ASC", relation3, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_DISTINCT_COUNT_DETECTION_SOURCE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.detection_source, "detection_source", "DESC", relation3, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_DISTINCT_COUNT_RELATIONSHIP_TYPE_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.relationship_type_id, "relationship_type_id", "ASC", relation3, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_DISTINCT_COUNT_RELATIONSHIP_TYPE_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.relationship_type_id, "relationship_type_id", "DESC", relation3, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_DISTINCT_COUNT_ROW_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.id, "id", "ASC", relation3, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_DISTINCT_COUNT_ROW_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.id, "id", "DESC", relation3, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_DISTINCT_COUNT_SOURCE_REPOSITORY_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.source_repository_id, "source_repository_id", "ASC", relation3, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_DISTINCT_COUNT_SOURCE_REPOSITORY_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.source_repository_id, "source_repository_id", "DESC", relation3, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_DISTINCT_COUNT_TARGET_REPOSITORY_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.target_repository_id, "target_repository_id", "ASC", relation3, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_DISTINCT_COUNT_TARGET_REPOSITORY_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.target_repository_id, "target_repository_id", "DESC", relation3, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_DISTINCT_COUNT_UPDATED_AT_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.updated_at, "updated_at", "ASC", relation3, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_DISTINCT_COUNT_UPDATED_AT_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.updated_at, "updated_at", "DESC", relation3, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_DISTINCT_COUNT_VERSION_CONSTRAINT_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.version_constraint, "version_constraint", "ASC", relation3, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_DISTINCT_COUNT_VERSION_CONSTRAINT_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.version_constraint, "version_constraint", "DESC", relation3, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_MAX_CONFIDENCE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_max, spec_repositoryRelationship.attributes.confidence, "confidence", "ASC", relation3, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_MAX_CONFIDENCE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_max, spec_repositoryRelationship.attributes.confidence, "confidence", "DESC", relation3, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_MIN_CONFIDENCE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_min, spec_repositoryRelationship.attributes.confidence, "confidence", "ASC", relation3, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_MIN_CONFIDENCE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_min, spec_repositoryRelationship.attributes.confidence, "confidence", "DESC", relation3, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_STDDEV_POPULATION_CONFIDENCE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_stddevPopulation, spec_repositoryRelationship.attributes.confidence, "confidence", "ASC", relation3, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_STDDEV_POPULATION_CONFIDENCE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_stddevPopulation, spec_repositoryRelationship.attributes.confidence, "confidence", "DESC", relation3, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_STDDEV_SAMPLE_CONFIDENCE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_stddevSample, spec_repositoryRelationship.attributes.confidence, "confidence", "ASC", relation3, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_STDDEV_SAMPLE_CONFIDENCE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_stddevSample, spec_repositoryRelationship.attributes.confidence, "confidence", "DESC", relation3, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_SUM_CONFIDENCE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_sum, spec_repositoryRelationship.attributes.confidence, "confidence", "ASC", relation3, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_SUM_CONFIDENCE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_sum, spec_repositoryRelationship.attributes.confidence, "confidence", "DESC", relation3, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_VARIANCE_POPULATION_CONFIDENCE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_variancePopulation, spec_repositoryRelationship.attributes.confidence, "confidence", "ASC", relation3, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_VARIANCE_POPULATION_CONFIDENCE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_variancePopulation, spec_repositoryRelationship.attributes.confidence, "confidence", "DESC", relation3, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_VARIANCE_SAMPLE_CONFIDENCE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_varianceSample, spec_repositoryRelationship.attributes.confidence, "confidence", "ASC", relation3, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_SOURCE_REPOSITORY_ID_VARIANCE_SAMPLE_CONFIDENCE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_varianceSample, spec_repositoryRelationship.attributes.confidence, "confidence", "DESC", relation3, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_AVERAGE_CONFIDENCE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_average, spec_repositoryRelationship.attributes.confidence, "confidence", "ASC", relation4, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_AVERAGE_CONFIDENCE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_average, spec_repositoryRelationship.attributes.confidence, "confidence", "DESC", relation4, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_COUNT_ASC($select) {
        pgAggregatesApplyOrderByTotalCount("ASC", relation4, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_COUNT_DESC($select) {
        pgAggregatesApplyOrderByTotalCount("DESC", relation4, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_DISTINCT_COUNT_BRANCH_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.branch, "branch", "ASC", relation4, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_DISTINCT_COUNT_BRANCH_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.branch, "branch", "DESC", relation4, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_DISTINCT_COUNT_CONFIDENCE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.confidence, "confidence", "ASC", relation4, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_DISTINCT_COUNT_CONFIDENCE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.confidence, "confidence", "DESC", relation4, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_DISTINCT_COUNT_CREATED_AT_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.created_at, "created_at", "ASC", relation4, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_DISTINCT_COUNT_CREATED_AT_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.created_at, "created_at", "DESC", relation4, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_DISTINCT_COUNT_DETECTION_SOURCE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.detection_source, "detection_source", "ASC", relation4, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_DISTINCT_COUNT_DETECTION_SOURCE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.detection_source, "detection_source", "DESC", relation4, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_DISTINCT_COUNT_RELATIONSHIP_TYPE_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.relationship_type_id, "relationship_type_id", "ASC", relation4, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_DISTINCT_COUNT_RELATIONSHIP_TYPE_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.relationship_type_id, "relationship_type_id", "DESC", relation4, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_DISTINCT_COUNT_ROW_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.id, "id", "ASC", relation4, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_DISTINCT_COUNT_ROW_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.id, "id", "DESC", relation4, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_DISTINCT_COUNT_SOURCE_REPOSITORY_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.source_repository_id, "source_repository_id", "ASC", relation4, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_DISTINCT_COUNT_SOURCE_REPOSITORY_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.source_repository_id, "source_repository_id", "DESC", relation4, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_DISTINCT_COUNT_TARGET_REPOSITORY_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.target_repository_id, "target_repository_id", "ASC", relation4, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_DISTINCT_COUNT_TARGET_REPOSITORY_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.target_repository_id, "target_repository_id", "DESC", relation4, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_DISTINCT_COUNT_UPDATED_AT_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.updated_at, "updated_at", "ASC", relation4, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_DISTINCT_COUNT_UPDATED_AT_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.updated_at, "updated_at", "DESC", relation4, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_DISTINCT_COUNT_VERSION_CONSTRAINT_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.version_constraint, "version_constraint", "ASC", relation4, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_DISTINCT_COUNT_VERSION_CONSTRAINT_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.version_constraint, "version_constraint", "DESC", relation4, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_MAX_CONFIDENCE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_max, spec_repositoryRelationship.attributes.confidence, "confidence", "ASC", relation4, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_MAX_CONFIDENCE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_max, spec_repositoryRelationship.attributes.confidence, "confidence", "DESC", relation4, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_MIN_CONFIDENCE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_min, spec_repositoryRelationship.attributes.confidence, "confidence", "ASC", relation4, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_MIN_CONFIDENCE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_min, spec_repositoryRelationship.attributes.confidence, "confidence", "DESC", relation4, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_STDDEV_POPULATION_CONFIDENCE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_stddevPopulation, spec_repositoryRelationship.attributes.confidence, "confidence", "ASC", relation4, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_STDDEV_POPULATION_CONFIDENCE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_stddevPopulation, spec_repositoryRelationship.attributes.confidence, "confidence", "DESC", relation4, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_STDDEV_SAMPLE_CONFIDENCE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_stddevSample, spec_repositoryRelationship.attributes.confidence, "confidence", "ASC", relation4, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_STDDEV_SAMPLE_CONFIDENCE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_stddevSample, spec_repositoryRelationship.attributes.confidence, "confidence", "DESC", relation4, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_SUM_CONFIDENCE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_sum, spec_repositoryRelationship.attributes.confidence, "confidence", "ASC", relation4, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_SUM_CONFIDENCE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_sum, spec_repositoryRelationship.attributes.confidence, "confidence", "DESC", relation4, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_VARIANCE_POPULATION_CONFIDENCE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_variancePopulation, spec_repositoryRelationship.attributes.confidence, "confidence", "ASC", relation4, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_VARIANCE_POPULATION_CONFIDENCE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_variancePopulation, spec_repositoryRelationship.attributes.confidence, "confidence", "DESC", relation4, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_VARIANCE_SAMPLE_CONFIDENCE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_varianceSample, spec_repositoryRelationship.attributes.confidence, "confidence", "ASC", relation4, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_TARGET_REPOSITORY_ID_VARIANCE_SAMPLE_CONFIDENCE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_varianceSample, spec_repositoryRelationship.attributes.confidence, "confidence", "DESC", relation4, spec_resource_repository_relationshipPgResource, $select);
      },
      ROW_ID_ASC: RepositoryOrderBy_ROW_ID_ASCApply,
      ROW_ID_DESC: RepositoryOrderBy_ROW_ID_DESCApply,
      SLUG_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "slug",
          direction: "ASC"
        });
      },
      SLUG_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "slug",
          direction: "DESC"
        });
      },
      UPDATED_AT_ASC: RepositoryOrderBy_UPDATED_AT_ASCApply,
      UPDATED_AT_DESC: RepositoryOrderBy_UPDATED_AT_DESCApply,
      VISIBILITY_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "visibility",
          direction: "ASC"
        });
      },
      VISIBILITY_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "visibility",
          direction: "DESC"
        });
      }
    }
  },
  RepositoryRelationshipGroupBy: {
    values: {
      BRANCH($pgSelect) {
        applyGroupByAttribute("branch", TYPES.text, $pgSelect);
      },
      CONFIDENCE($pgSelect) {
        applyGroupByAttribute("confidence", TYPES.float4, $pgSelect);
      },
      CREATED_AT: RepositoryCollaboratorGroupBy_CREATED_ATApply,
      CREATED_AT_TRUNCATED_TO_DAY: RepositoryCollaboratorGroupBy_CREATED_AT_TRUNCATED_TO_DAYApply,
      CREATED_AT_TRUNCATED_TO_HOUR: RepositoryCollaboratorGroupBy_CREATED_AT_TRUNCATED_TO_HOURApply,
      DETECTION_SOURCE: ExternalDependencyGroupBy_DETECTION_SOURCEApply,
      RELATIONSHIP_TYPE_ID($pgSelect) {
        applyGroupByAttribute("relationship_type_id", TYPES.uuid, $pgSelect);
      },
      SOURCE_REPOSITORY_ID($pgSelect) {
        applyGroupByAttribute("source_repository_id", TYPES.uuid, $pgSelect);
      },
      TARGET_REPOSITORY_ID($pgSelect) {
        applyGroupByAttribute("target_repository_id", TYPES.uuid, $pgSelect);
      },
      UPDATED_AT: RepositoryCollaboratorGroupBy_UPDATED_ATApply,
      UPDATED_AT_TRUNCATED_TO_DAY: RepositoryCollaboratorGroupBy_UPDATED_AT_TRUNCATED_TO_DAYApply,
      UPDATED_AT_TRUNCATED_TO_HOUR: RepositoryCollaboratorGroupBy_UPDATED_AT_TRUNCATED_TO_HOURApply,
      VERSION_CONSTRAINT: ExternalDependencyGroupBy_VERSION_CONSTRAINTApply
    }
  },
  RepositoryRelationshipMetadatumGroupBy: {
    values: {
      CREATED_AT: RepositoryCollaboratorGroupBy_CREATED_ATApply,
      CREATED_AT_TRUNCATED_TO_DAY: RepositoryCollaboratorGroupBy_CREATED_AT_TRUNCATED_TO_DAYApply,
      CREATED_AT_TRUNCATED_TO_HOUR: RepositoryCollaboratorGroupBy_CREATED_AT_TRUNCATED_TO_HOURApply,
      KEY($pgSelect) {
        applyGroupByAttribute("key", TYPES.text, $pgSelect);
      },
      RELATIONSHIP_ID($pgSelect) {
        applyGroupByAttribute("relationship_id", TYPES.uuid, $pgSelect);
      },
      VALUE($pgSelect) {
        applyGroupByAttribute("value", TYPES.text, $pgSelect);
      }
    }
  },
  RepositoryRelationshipMetadatumOrderBy: {
    values: {
      CREATED_AT_ASC: RepositoryOrderBy_CREATED_AT_ASCApply,
      CREATED_AT_DESC: RepositoryOrderBy_CREATED_AT_DESCApply,
      KEY_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "key",
          direction: "ASC"
        });
      },
      KEY_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "key",
          direction: "DESC"
        });
      },
      PRIMARY_KEY_ASC(queryBuilder) {
        repository_relationship_metadataUniques[0].attributes.forEach(attributeName => {
          queryBuilder.orderBy({
            attribute: attributeName,
            direction: "ASC"
          });
        });
        queryBuilder.setOrderIsUnique();
      },
      PRIMARY_KEY_DESC(queryBuilder) {
        repository_relationship_metadataUniques[0].attributes.forEach(attributeName => {
          queryBuilder.orderBy({
            attribute: attributeName,
            direction: "DESC"
          });
        });
        queryBuilder.setOrderIsUnique();
      },
      RELATIONSHIP_ID_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "relationship_id",
          direction: "ASC"
        });
      },
      RELATIONSHIP_ID_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "relationship_id",
          direction: "DESC"
        });
      },
      ROW_ID_ASC: RepositoryOrderBy_ROW_ID_ASCApply,
      ROW_ID_DESC: RepositoryOrderBy_ROW_ID_DESCApply,
      VALUE_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "value",
          direction: "ASC"
        });
      },
      VALUE_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "value",
          direction: "DESC"
        });
      }
    }
  },
  RepositoryRelationshipOrderBy: {
    values: {
      BRANCH_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "branch",
          direction: "ASC"
        });
      },
      BRANCH_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "branch",
          direction: "DESC"
        });
      },
      CONFIDENCE_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "confidence",
          direction: "ASC"
        });
      },
      CONFIDENCE_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "confidence",
          direction: "DESC"
        });
      },
      CREATED_AT_ASC: RepositoryOrderBy_CREATED_AT_ASCApply,
      CREATED_AT_DESC: RepositoryOrderBy_CREATED_AT_DESCApply,
      DETECTION_SOURCE_ASC: ExternalDependencyOrderBy_DETECTION_SOURCE_ASCApply,
      DETECTION_SOURCE_DESC: ExternalDependencyOrderBy_DETECTION_SOURCE_DESCApply,
      PRIMARY_KEY_ASC(queryBuilder) {
        repository_relationshipUniques[0].attributes.forEach(attributeName => {
          queryBuilder.orderBy({
            attribute: attributeName,
            direction: "ASC"
          });
        });
        queryBuilder.setOrderIsUnique();
      },
      PRIMARY_KEY_DESC(queryBuilder) {
        repository_relationshipUniques[0].attributes.forEach(attributeName => {
          queryBuilder.orderBy({
            attribute: attributeName,
            direction: "DESC"
          });
        });
        queryBuilder.setOrderIsUnique();
      },
      RELATIONSHIP_TYPE_ID_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "relationship_type_id",
          direction: "ASC"
        });
      },
      RELATIONSHIP_TYPE_ID_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "relationship_type_id",
          direction: "DESC"
        });
      },
      REPOSITORY_RELATIONSHIP_METADATA_BY_RELATIONSHIP_ID_COUNT_ASC($select) {
        pgAggregatesApplyOrderByTotalCount("ASC", relation8, spec_resource_repository_relationship_metadataPgResource, $select);
      },
      REPOSITORY_RELATIONSHIP_METADATA_BY_RELATIONSHIP_ID_COUNT_DESC($select) {
        pgAggregatesApplyOrderByTotalCount("DESC", relation8, spec_resource_repository_relationship_metadataPgResource, $select);
      },
      REPOSITORY_RELATIONSHIP_METADATA_BY_RELATIONSHIP_ID_DISTINCT_COUNT_CREATED_AT_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationshipMetadata.attributes.created_at, "created_at", "ASC", relation8, spec_resource_repository_relationship_metadataPgResource, $select);
      },
      REPOSITORY_RELATIONSHIP_METADATA_BY_RELATIONSHIP_ID_DISTINCT_COUNT_CREATED_AT_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationshipMetadata.attributes.created_at, "created_at", "DESC", relation8, spec_resource_repository_relationship_metadataPgResource, $select);
      },
      REPOSITORY_RELATIONSHIP_METADATA_BY_RELATIONSHIP_ID_DISTINCT_COUNT_KEY_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationshipMetadata.attributes.key, "key", "ASC", relation8, spec_resource_repository_relationship_metadataPgResource, $select);
      },
      REPOSITORY_RELATIONSHIP_METADATA_BY_RELATIONSHIP_ID_DISTINCT_COUNT_KEY_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationshipMetadata.attributes.key, "key", "DESC", relation8, spec_resource_repository_relationship_metadataPgResource, $select);
      },
      REPOSITORY_RELATIONSHIP_METADATA_BY_RELATIONSHIP_ID_DISTINCT_COUNT_RELATIONSHIP_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationshipMetadata.attributes.relationship_id, "relationship_id", "ASC", relation8, spec_resource_repository_relationship_metadataPgResource, $select);
      },
      REPOSITORY_RELATIONSHIP_METADATA_BY_RELATIONSHIP_ID_DISTINCT_COUNT_RELATIONSHIP_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationshipMetadata.attributes.relationship_id, "relationship_id", "DESC", relation8, spec_resource_repository_relationship_metadataPgResource, $select);
      },
      REPOSITORY_RELATIONSHIP_METADATA_BY_RELATIONSHIP_ID_DISTINCT_COUNT_ROW_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationshipMetadata.attributes.id, "id", "ASC", relation8, spec_resource_repository_relationship_metadataPgResource, $select);
      },
      REPOSITORY_RELATIONSHIP_METADATA_BY_RELATIONSHIP_ID_DISTINCT_COUNT_ROW_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationshipMetadata.attributes.id, "id", "DESC", relation8, spec_resource_repository_relationship_metadataPgResource, $select);
      },
      REPOSITORY_RELATIONSHIP_METADATA_BY_RELATIONSHIP_ID_DISTINCT_COUNT_VALUE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationshipMetadata.attributes.value, "value", "ASC", relation8, spec_resource_repository_relationship_metadataPgResource, $select);
      },
      REPOSITORY_RELATIONSHIP_METADATA_BY_RELATIONSHIP_ID_DISTINCT_COUNT_VALUE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationshipMetadata.attributes.value, "value", "DESC", relation8, spec_resource_repository_relationship_metadataPgResource, $select);
      },
      ROW_ID_ASC: RepositoryOrderBy_ROW_ID_ASCApply,
      ROW_ID_DESC: RepositoryOrderBy_ROW_ID_DESCApply,
      SOURCE_REPOSITORY_ID_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "source_repository_id",
          direction: "ASC"
        });
      },
      SOURCE_REPOSITORY_ID_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "source_repository_id",
          direction: "DESC"
        });
      },
      TARGET_REPOSITORY_ID_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "target_repository_id",
          direction: "ASC"
        });
      },
      TARGET_REPOSITORY_ID_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "target_repository_id",
          direction: "DESC"
        });
      },
      UPDATED_AT_ASC: RepositoryOrderBy_UPDATED_AT_ASCApply,
      UPDATED_AT_DESC: RepositoryOrderBy_UPDATED_AT_DESCApply,
      VERSION_CONSTRAINT_ASC: ExternalDependencyOrderBy_VERSION_CONSTRAINT_ASCApply,
      VERSION_CONSTRAINT_DESC: ExternalDependencyOrderBy_VERSION_CONSTRAINT_DESCApply
    }
  },
  RepositoryRelationshipTypeGroupBy: {
    values: {
      CREATED_AT: RepositoryCollaboratorGroupBy_CREATED_ATApply,
      CREATED_AT_TRUNCATED_TO_DAY: RepositoryCollaboratorGroupBy_CREATED_AT_TRUNCATED_TO_DAYApply,
      CREATED_AT_TRUNCATED_TO_HOUR: RepositoryCollaboratorGroupBy_CREATED_AT_TRUNCATED_TO_HOURApply,
      DESCRIPTION: PullRequestGroupBy_DESCRIPTIONApply,
      IS_DIRECTED($pgSelect) {
        applyGroupByAttribute("is_directed", TYPES.boolean, $pgSelect);
      },
      NAME: RepositoryGroupBy_NAMEApply,
      ORGANIZATION_ID: RepositoryGroupBy_ORGANIZATION_IDApply
    }
  },
  RepositoryRelationshipTypeOrderBy: {
    values: {
      CREATED_AT_ASC: RepositoryOrderBy_CREATED_AT_ASCApply,
      CREATED_AT_DESC: RepositoryOrderBy_CREATED_AT_DESCApply,
      DESCRIPTION_ASC: RepositoryOrderBy_DESCRIPTION_ASCApply,
      DESCRIPTION_DESC: RepositoryOrderBy_DESCRIPTION_DESCApply,
      IS_DIRECTED_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "is_directed",
          direction: "ASC"
        });
      },
      IS_DIRECTED_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "is_directed",
          direction: "DESC"
        });
      },
      NAME_ASC: RepositoryOrderBy_NAME_ASCApply,
      NAME_DESC: RepositoryOrderBy_NAME_DESCApply,
      ORGANIZATION_ID_ASC: RepositoryOrderBy_ORGANIZATION_ID_ASCApply,
      ORGANIZATION_ID_DESC: RepositoryOrderBy_ORGANIZATION_ID_DESCApply,
      PRIMARY_KEY_ASC(queryBuilder) {
        repository_relationship_typeUniques[0].attributes.forEach(attributeName => {
          queryBuilder.orderBy({
            attribute: attributeName,
            direction: "ASC"
          });
        });
        queryBuilder.setOrderIsUnique();
      },
      PRIMARY_KEY_DESC(queryBuilder) {
        repository_relationship_typeUniques[0].attributes.forEach(attributeName => {
          queryBuilder.orderBy({
            attribute: attributeName,
            direction: "DESC"
          });
        });
        queryBuilder.setOrderIsUnique();
      },
      REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_AVERAGE_CONFIDENCE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_average, spec_repositoryRelationship.attributes.confidence, "confidence", "ASC", relation9, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_AVERAGE_CONFIDENCE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_average, spec_repositoryRelationship.attributes.confidence, "confidence", "DESC", relation9, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_COUNT_ASC($select) {
        pgAggregatesApplyOrderByTotalCount("ASC", relation9, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_COUNT_DESC($select) {
        pgAggregatesApplyOrderByTotalCount("DESC", relation9, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_DISTINCT_COUNT_BRANCH_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.branch, "branch", "ASC", relation9, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_DISTINCT_COUNT_BRANCH_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.branch, "branch", "DESC", relation9, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_DISTINCT_COUNT_CONFIDENCE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.confidence, "confidence", "ASC", relation9, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_DISTINCT_COUNT_CONFIDENCE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.confidence, "confidence", "DESC", relation9, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_DISTINCT_COUNT_CREATED_AT_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.created_at, "created_at", "ASC", relation9, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_DISTINCT_COUNT_CREATED_AT_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.created_at, "created_at", "DESC", relation9, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_DISTINCT_COUNT_DETECTION_SOURCE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.detection_source, "detection_source", "ASC", relation9, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_DISTINCT_COUNT_DETECTION_SOURCE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.detection_source, "detection_source", "DESC", relation9, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_DISTINCT_COUNT_RELATIONSHIP_TYPE_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.relationship_type_id, "relationship_type_id", "ASC", relation9, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_DISTINCT_COUNT_RELATIONSHIP_TYPE_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.relationship_type_id, "relationship_type_id", "DESC", relation9, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_DISTINCT_COUNT_ROW_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.id, "id", "ASC", relation9, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_DISTINCT_COUNT_ROW_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.id, "id", "DESC", relation9, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_DISTINCT_COUNT_SOURCE_REPOSITORY_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.source_repository_id, "source_repository_id", "ASC", relation9, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_DISTINCT_COUNT_SOURCE_REPOSITORY_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.source_repository_id, "source_repository_id", "DESC", relation9, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_DISTINCT_COUNT_TARGET_REPOSITORY_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.target_repository_id, "target_repository_id", "ASC", relation9, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_DISTINCT_COUNT_TARGET_REPOSITORY_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.target_repository_id, "target_repository_id", "DESC", relation9, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_DISTINCT_COUNT_UPDATED_AT_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.updated_at, "updated_at", "ASC", relation9, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_DISTINCT_COUNT_UPDATED_AT_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.updated_at, "updated_at", "DESC", relation9, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_DISTINCT_COUNT_VERSION_CONSTRAINT_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.version_constraint, "version_constraint", "ASC", relation9, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_DISTINCT_COUNT_VERSION_CONSTRAINT_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryRelationship.attributes.version_constraint, "version_constraint", "DESC", relation9, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_MAX_CONFIDENCE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_max, spec_repositoryRelationship.attributes.confidence, "confidence", "ASC", relation9, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_MAX_CONFIDENCE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_max, spec_repositoryRelationship.attributes.confidence, "confidence", "DESC", relation9, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_MIN_CONFIDENCE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_min, spec_repositoryRelationship.attributes.confidence, "confidence", "ASC", relation9, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_MIN_CONFIDENCE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_min, spec_repositoryRelationship.attributes.confidence, "confidence", "DESC", relation9, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_STDDEV_POPULATION_CONFIDENCE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_stddevPopulation, spec_repositoryRelationship.attributes.confidence, "confidence", "ASC", relation9, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_STDDEV_POPULATION_CONFIDENCE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_stddevPopulation, spec_repositoryRelationship.attributes.confidence, "confidence", "DESC", relation9, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_STDDEV_SAMPLE_CONFIDENCE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_stddevSample, spec_repositoryRelationship.attributes.confidence, "confidence", "ASC", relation9, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_STDDEV_SAMPLE_CONFIDENCE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_stddevSample, spec_repositoryRelationship.attributes.confidence, "confidence", "DESC", relation9, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_SUM_CONFIDENCE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_sum, spec_repositoryRelationship.attributes.confidence, "confidence", "ASC", relation9, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_SUM_CONFIDENCE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_sum, spec_repositoryRelationship.attributes.confidence, "confidence", "DESC", relation9, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_VARIANCE_POPULATION_CONFIDENCE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_variancePopulation, spec_repositoryRelationship.attributes.confidence, "confidence", "ASC", relation9, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_VARIANCE_POPULATION_CONFIDENCE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_variancePopulation, spec_repositoryRelationship.attributes.confidence, "confidence", "DESC", relation9, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_VARIANCE_SAMPLE_CONFIDENCE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_varianceSample, spec_repositoryRelationship.attributes.confidence, "confidence", "ASC", relation9, spec_resource_repository_relationshipPgResource, $select);
      },
      REPOSITORY_RELATIONSHIPS_BY_RELATIONSHIP_TYPE_ID_VARIANCE_SAMPLE_CONFIDENCE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_varianceSample, spec_repositoryRelationship.attributes.confidence, "confidence", "DESC", relation9, spec_resource_repository_relationshipPgResource, $select);
      },
      ROW_ID_ASC: RepositoryOrderBy_ROW_ID_ASCApply,
      ROW_ID_DESC: RepositoryOrderBy_ROW_ID_DESCApply
    }
  },
  UserGroupBy: {
    values: {
      AVATAR_URL: UserGroupBy_AVATAR_URLApply,
      BIO($pgSelect) {
        applyGroupByAttribute("bio", TYPES.text, $pgSelect);
      },
      CREATED_AT: RepositoryCollaboratorGroupBy_CREATED_ATApply,
      CREATED_AT_TRUNCATED_TO_DAY: RepositoryCollaboratorGroupBy_CREATED_AT_TRUNCATED_TO_DAYApply,
      CREATED_AT_TRUNCATED_TO_HOUR: RepositoryCollaboratorGroupBy_CREATED_AT_TRUNCATED_TO_HOURApply,
      NAME: RepositoryGroupBy_NAMEApply,
      UPDATED_AT: RepositoryCollaboratorGroupBy_UPDATED_ATApply,
      UPDATED_AT_TRUNCATED_TO_DAY: RepositoryCollaboratorGroupBy_UPDATED_AT_TRUNCATED_TO_DAYApply,
      UPDATED_AT_TRUNCATED_TO_HOUR: RepositoryCollaboratorGroupBy_UPDATED_AT_TRUNCATED_TO_HOURApply
    }
  },
  UserOrderBy: {
    values: {
      AUTHORED_PULL_REQUEST_COMMENTS_AVERAGE_LINE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_average, spec_pullRequestComment.attributes.line, "line", "ASC", relation12, spec_resource_pull_request_commentPgResource, $select);
      },
      AUTHORED_PULL_REQUEST_COMMENTS_AVERAGE_LINE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_average, spec_pullRequestComment.attributes.line, "line", "DESC", relation12, spec_resource_pull_request_commentPgResource, $select);
      },
      AUTHORED_PULL_REQUEST_COMMENTS_COUNT_ASC($select) {
        pgAggregatesApplyOrderByTotalCount("ASC", relation12, spec_resource_pull_request_commentPgResource, $select);
      },
      AUTHORED_PULL_REQUEST_COMMENTS_COUNT_DESC($select) {
        pgAggregatesApplyOrderByTotalCount("DESC", relation12, spec_resource_pull_request_commentPgResource, $select);
      },
      AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_AUTHOR_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.author_id, "author_id", "ASC", relation12, spec_resource_pull_request_commentPgResource, $select);
      },
      AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_AUTHOR_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.author_id, "author_id", "DESC", relation12, spec_resource_pull_request_commentPgResource, $select);
      },
      AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_BODY_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.body, "body", "ASC", relation12, spec_resource_pull_request_commentPgResource, $select);
      },
      AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_BODY_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.body, "body", "DESC", relation12, spec_resource_pull_request_commentPgResource, $select);
      },
      AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_COMMIT_SHA_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.commit_sha, "commit_sha", "ASC", relation12, spec_resource_pull_request_commentPgResource, $select);
      },
      AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_COMMIT_SHA_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.commit_sha, "commit_sha", "DESC", relation12, spec_resource_pull_request_commentPgResource, $select);
      },
      AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_CREATED_AT_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.created_at, "created_at", "ASC", relation12, spec_resource_pull_request_commentPgResource, $select);
      },
      AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_CREATED_AT_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.created_at, "created_at", "DESC", relation12, spec_resource_pull_request_commentPgResource, $select);
      },
      AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_LINE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.line, "line", "ASC", relation12, spec_resource_pull_request_commentPgResource, $select);
      },
      AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_LINE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.line, "line", "DESC", relation12, spec_resource_pull_request_commentPgResource, $select);
      },
      AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_PATH_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.path, "path", "ASC", relation12, spec_resource_pull_request_commentPgResource, $select);
      },
      AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_PATH_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.path, "path", "DESC", relation12, spec_resource_pull_request_commentPgResource, $select);
      },
      AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_PULL_REQUEST_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.pull_request_id, "pull_request_id", "ASC", relation12, spec_resource_pull_request_commentPgResource, $select);
      },
      AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_PULL_REQUEST_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.pull_request_id, "pull_request_id", "DESC", relation12, spec_resource_pull_request_commentPgResource, $select);
      },
      AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_REPLY_TO_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.reply_to_id, "reply_to_id", "ASC", relation12, spec_resource_pull_request_commentPgResource, $select);
      },
      AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_REPLY_TO_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.reply_to_id, "reply_to_id", "DESC", relation12, spec_resource_pull_request_commentPgResource, $select);
      },
      AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_ROW_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.id, "id", "ASC", relation12, spec_resource_pull_request_commentPgResource, $select);
      },
      AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_ROW_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.id, "id", "DESC", relation12, spec_resource_pull_request_commentPgResource, $select);
      },
      AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_SIDE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.side, "side", "ASC", relation12, spec_resource_pull_request_commentPgResource, $select);
      },
      AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_SIDE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.side, "side", "DESC", relation12, spec_resource_pull_request_commentPgResource, $select);
      },
      AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_UPDATED_AT_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.updated_at, "updated_at", "ASC", relation12, spec_resource_pull_request_commentPgResource, $select);
      },
      AUTHORED_PULL_REQUEST_COMMENTS_DISTINCT_COUNT_UPDATED_AT_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestComment.attributes.updated_at, "updated_at", "DESC", relation12, spec_resource_pull_request_commentPgResource, $select);
      },
      AUTHORED_PULL_REQUEST_COMMENTS_MAX_LINE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_max, spec_pullRequestComment.attributes.line, "line", "ASC", relation12, spec_resource_pull_request_commentPgResource, $select);
      },
      AUTHORED_PULL_REQUEST_COMMENTS_MAX_LINE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_max, spec_pullRequestComment.attributes.line, "line", "DESC", relation12, spec_resource_pull_request_commentPgResource, $select);
      },
      AUTHORED_PULL_REQUEST_COMMENTS_MIN_LINE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_min, spec_pullRequestComment.attributes.line, "line", "ASC", relation12, spec_resource_pull_request_commentPgResource, $select);
      },
      AUTHORED_PULL_REQUEST_COMMENTS_MIN_LINE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_min, spec_pullRequestComment.attributes.line, "line", "DESC", relation12, spec_resource_pull_request_commentPgResource, $select);
      },
      AUTHORED_PULL_REQUEST_COMMENTS_STDDEV_POPULATION_LINE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_stddevPopulation, spec_pullRequestComment.attributes.line, "line", "ASC", relation12, spec_resource_pull_request_commentPgResource, $select);
      },
      AUTHORED_PULL_REQUEST_COMMENTS_STDDEV_POPULATION_LINE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_stddevPopulation, spec_pullRequestComment.attributes.line, "line", "DESC", relation12, spec_resource_pull_request_commentPgResource, $select);
      },
      AUTHORED_PULL_REQUEST_COMMENTS_STDDEV_SAMPLE_LINE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_stddevSample, spec_pullRequestComment.attributes.line, "line", "ASC", relation12, spec_resource_pull_request_commentPgResource, $select);
      },
      AUTHORED_PULL_REQUEST_COMMENTS_STDDEV_SAMPLE_LINE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_stddevSample, spec_pullRequestComment.attributes.line, "line", "DESC", relation12, spec_resource_pull_request_commentPgResource, $select);
      },
      AUTHORED_PULL_REQUEST_COMMENTS_SUM_LINE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_sum, spec_pullRequestComment.attributes.line, "line", "ASC", relation12, spec_resource_pull_request_commentPgResource, $select);
      },
      AUTHORED_PULL_REQUEST_COMMENTS_SUM_LINE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_sum, spec_pullRequestComment.attributes.line, "line", "DESC", relation12, spec_resource_pull_request_commentPgResource, $select);
      },
      AUTHORED_PULL_REQUEST_COMMENTS_VARIANCE_POPULATION_LINE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_variancePopulation, spec_pullRequestComment.attributes.line, "line", "ASC", relation12, spec_resource_pull_request_commentPgResource, $select);
      },
      AUTHORED_PULL_REQUEST_COMMENTS_VARIANCE_POPULATION_LINE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_variancePopulation, spec_pullRequestComment.attributes.line, "line", "DESC", relation12, spec_resource_pull_request_commentPgResource, $select);
      },
      AUTHORED_PULL_REQUEST_COMMENTS_VARIANCE_SAMPLE_LINE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_varianceSample, spec_pullRequestComment.attributes.line, "line", "ASC", relation12, spec_resource_pull_request_commentPgResource, $select);
      },
      AUTHORED_PULL_REQUEST_COMMENTS_VARIANCE_SAMPLE_LINE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_varianceSample, spec_pullRequestComment.attributes.line, "line", "DESC", relation12, spec_resource_pull_request_commentPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_AVERAGE_NUMBER_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_average, spec_pullRequest.attributes.number, "number", "ASC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_AVERAGE_NUMBER_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_average, spec_pullRequest.attributes.number, "number", "DESC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_COUNT_ASC($select) {
        pgAggregatesApplyOrderByTotalCount("ASC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_COUNT_DESC($select) {
        pgAggregatesApplyOrderByTotalCount("DESC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_AUTHOR_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.author_id, "author_id", "ASC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_AUTHOR_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.author_id, "author_id", "DESC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_CLOSED_AT_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.closed_at, "closed_at", "ASC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_CLOSED_AT_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.closed_at, "closed_at", "DESC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_CREATED_AT_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.created_at, "created_at", "ASC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_CREATED_AT_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.created_at, "created_at", "DESC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_DESCRIPTION_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.description, "description", "ASC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_DESCRIPTION_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.description, "description", "DESC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_MERGE_COMMIT_SHA_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.merge_commit_sha, "merge_commit_sha", "ASC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_MERGE_COMMIT_SHA_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.merge_commit_sha, "merge_commit_sha", "DESC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_MERGED_AT_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.merged_at, "merged_at", "ASC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_MERGED_AT_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.merged_at, "merged_at", "DESC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_MERGED_BY_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.merged_by_id, "merged_by_id", "ASC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_MERGED_BY_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.merged_by_id, "merged_by_id", "DESC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_NUMBER_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.number, "number", "ASC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_NUMBER_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.number, "number", "DESC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_REPOSITORY_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.repository_id, "repository_id", "ASC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_REPOSITORY_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.repository_id, "repository_id", "DESC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_ROW_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.id, "id", "ASC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_ROW_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.id, "id", "DESC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_SOURCE_BRANCH_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.source_branch, "source_branch", "ASC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_SOURCE_BRANCH_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.source_branch, "source_branch", "DESC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_STATE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.state, "state", "ASC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_STATE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.state, "state", "DESC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_TARGET_BRANCH_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.target_branch, "target_branch", "ASC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_TARGET_BRANCH_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.target_branch, "target_branch", "DESC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_TITLE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.title, "title", "ASC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_TITLE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.title, "title", "DESC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_UPDATED_AT_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.updated_at, "updated_at", "ASC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_DISTINCT_COUNT_UPDATED_AT_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.updated_at, "updated_at", "DESC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_MAX_NUMBER_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_max, spec_pullRequest.attributes.number, "number", "ASC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_MAX_NUMBER_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_max, spec_pullRequest.attributes.number, "number", "DESC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_MIN_NUMBER_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_min, spec_pullRequest.attributes.number, "number", "ASC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_MIN_NUMBER_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_min, spec_pullRequest.attributes.number, "number", "DESC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_STDDEV_POPULATION_NUMBER_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_stddevPopulation, spec_pullRequest.attributes.number, "number", "ASC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_STDDEV_POPULATION_NUMBER_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_stddevPopulation, spec_pullRequest.attributes.number, "number", "DESC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_STDDEV_SAMPLE_NUMBER_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_stddevSample, spec_pullRequest.attributes.number, "number", "ASC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_STDDEV_SAMPLE_NUMBER_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_stddevSample, spec_pullRequest.attributes.number, "number", "DESC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_SUM_NUMBER_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_sum, spec_pullRequest.attributes.number, "number", "ASC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_SUM_NUMBER_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_sum, spec_pullRequest.attributes.number, "number", "DESC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_VARIANCE_POPULATION_NUMBER_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_variancePopulation, spec_pullRequest.attributes.number, "number", "ASC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_VARIANCE_POPULATION_NUMBER_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_variancePopulation, spec_pullRequest.attributes.number, "number", "DESC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_VARIANCE_SAMPLE_NUMBER_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_varianceSample, spec_pullRequest.attributes.number, "number", "ASC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AUTHORED_PULL_REQUESTS_VARIANCE_SAMPLE_NUMBER_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_varianceSample, spec_pullRequest.attributes.number, "number", "DESC", relation14, spec_resource_pull_requestPgResource, $select);
      },
      AVATAR_URL_ASC: UserOrderBy_AVATAR_URL_ASCApply,
      AVATAR_URL_DESC: UserOrderBy_AVATAR_URL_DESCApply,
      BIO_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "bio",
          direction: "ASC"
        });
      },
      BIO_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "bio",
          direction: "DESC"
        });
      },
      CREATED_AT_ASC: RepositoryOrderBy_CREATED_AT_ASCApply,
      CREATED_AT_DESC: RepositoryOrderBy_CREATED_AT_DESCApply,
      EMAIL_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "email",
          direction: "ASC"
        });
        queryBuilder.setOrderIsUnique();
      },
      EMAIL_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "email",
          direction: "DESC"
        });
        queryBuilder.setOrderIsUnique();
      },
      IDENTITY_PROVIDER_ID_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "identity_provider_id",
          direction: "ASC"
        });
        queryBuilder.setOrderIsUnique();
      },
      IDENTITY_PROVIDER_ID_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "identity_provider_id",
          direction: "DESC"
        });
        queryBuilder.setOrderIsUnique();
      },
      NAME_ASC: RepositoryOrderBy_NAME_ASCApply,
      NAME_DESC: RepositoryOrderBy_NAME_DESCApply,
      PRIMARY_KEY_ASC(queryBuilder) {
        userUniques[0].attributes.forEach(attributeName => {
          queryBuilder.orderBy({
            attribute: attributeName,
            direction: "ASC"
          });
        });
        queryBuilder.setOrderIsUnique();
      },
      PRIMARY_KEY_DESC(queryBuilder) {
        userUniques[0].attributes.forEach(attributeName => {
          queryBuilder.orderBy({
            attribute: attributeName,
            direction: "DESC"
          });
        });
        queryBuilder.setOrderIsUnique();
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_AVERAGE_NUMBER_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_average, spec_pullRequest.attributes.number, "number", "ASC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_AVERAGE_NUMBER_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_average, spec_pullRequest.attributes.number, "number", "DESC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_COUNT_ASC($select) {
        pgAggregatesApplyOrderByTotalCount("ASC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_COUNT_DESC($select) {
        pgAggregatesApplyOrderByTotalCount("DESC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_AUTHOR_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.author_id, "author_id", "ASC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_AUTHOR_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.author_id, "author_id", "DESC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_CLOSED_AT_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.closed_at, "closed_at", "ASC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_CLOSED_AT_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.closed_at, "closed_at", "DESC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_CREATED_AT_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.created_at, "created_at", "ASC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_CREATED_AT_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.created_at, "created_at", "DESC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_DESCRIPTION_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.description, "description", "ASC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_DESCRIPTION_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.description, "description", "DESC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_MERGE_COMMIT_SHA_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.merge_commit_sha, "merge_commit_sha", "ASC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_MERGE_COMMIT_SHA_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.merge_commit_sha, "merge_commit_sha", "DESC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_MERGED_AT_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.merged_at, "merged_at", "ASC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_MERGED_AT_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.merged_at, "merged_at", "DESC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_MERGED_BY_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.merged_by_id, "merged_by_id", "ASC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_MERGED_BY_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.merged_by_id, "merged_by_id", "DESC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_NUMBER_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.number, "number", "ASC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_NUMBER_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.number, "number", "DESC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_REPOSITORY_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.repository_id, "repository_id", "ASC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_REPOSITORY_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.repository_id, "repository_id", "DESC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_ROW_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.id, "id", "ASC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_ROW_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.id, "id", "DESC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_SOURCE_BRANCH_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.source_branch, "source_branch", "ASC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_SOURCE_BRANCH_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.source_branch, "source_branch", "DESC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_STATE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.state, "state", "ASC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_STATE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.state, "state", "DESC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_TARGET_BRANCH_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.target_branch, "target_branch", "ASC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_TARGET_BRANCH_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.target_branch, "target_branch", "DESC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_TITLE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.title, "title", "ASC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_TITLE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.title, "title", "DESC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_UPDATED_AT_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.updated_at, "updated_at", "ASC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_DISTINCT_COUNT_UPDATED_AT_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequest.attributes.updated_at, "updated_at", "DESC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_MAX_NUMBER_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_max, spec_pullRequest.attributes.number, "number", "ASC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_MAX_NUMBER_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_max, spec_pullRequest.attributes.number, "number", "DESC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_MIN_NUMBER_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_min, spec_pullRequest.attributes.number, "number", "ASC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_MIN_NUMBER_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_min, spec_pullRequest.attributes.number, "number", "DESC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_STDDEV_POPULATION_NUMBER_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_stddevPopulation, spec_pullRequest.attributes.number, "number", "ASC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_STDDEV_POPULATION_NUMBER_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_stddevPopulation, spec_pullRequest.attributes.number, "number", "DESC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_STDDEV_SAMPLE_NUMBER_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_stddevSample, spec_pullRequest.attributes.number, "number", "ASC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_STDDEV_SAMPLE_NUMBER_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_stddevSample, spec_pullRequest.attributes.number, "number", "DESC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_SUM_NUMBER_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_sum, spec_pullRequest.attributes.number, "number", "ASC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_SUM_NUMBER_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_sum, spec_pullRequest.attributes.number, "number", "DESC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_VARIANCE_POPULATION_NUMBER_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_variancePopulation, spec_pullRequest.attributes.number, "number", "ASC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_VARIANCE_POPULATION_NUMBER_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_variancePopulation, spec_pullRequest.attributes.number, "number", "DESC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_VARIANCE_SAMPLE_NUMBER_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_varianceSample, spec_pullRequest.attributes.number, "number", "ASC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      PULL_REQUESTS_BY_MERGED_BY_ID_VARIANCE_SAMPLE_NUMBER_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_varianceSample, spec_pullRequest.attributes.number, "number", "DESC", relation15, spec_resource_pull_requestPgResource, $select);
      },
      REPOSITORIES_BY_OWNER_ID_COUNT_ASC($select) {
        pgAggregatesApplyOrderByTotalCount("ASC", relation10, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORIES_BY_OWNER_ID_COUNT_DESC($select) {
        pgAggregatesApplyOrderByTotalCount("DESC", relation10, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_CREATED_AT_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repository.attributes.created_at, "created_at", "ASC", relation10, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_CREATED_AT_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repository.attributes.created_at, "created_at", "DESC", relation10, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_DEFAULT_BRANCH_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repository.attributes.default_branch, "default_branch", "ASC", relation10, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_DEFAULT_BRANCH_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repository.attributes.default_branch, "default_branch", "DESC", relation10, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_DESCRIPTION_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repository.attributes.description, "description", "ASC", relation10, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_DESCRIPTION_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repository.attributes.description, "description", "DESC", relation10, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_NAME_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repository.attributes.name, "name", "ASC", relation10, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_NAME_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repository.attributes.name, "name", "DESC", relation10, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_ORGANIZATION_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repository.attributes.organization_id, "organization_id", "ASC", relation10, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_ORGANIZATION_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repository.attributes.organization_id, "organization_id", "DESC", relation10, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_OWNER_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repository.attributes.owner_id, "owner_id", "ASC", relation10, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_OWNER_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repository.attributes.owner_id, "owner_id", "DESC", relation10, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_ROW_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repository.attributes.id, "id", "ASC", relation10, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_ROW_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repository.attributes.id, "id", "DESC", relation10, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_SLUG_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repository.attributes.slug, "slug", "ASC", relation10, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_SLUG_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repository.attributes.slug, "slug", "DESC", relation10, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_UPDATED_AT_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repository.attributes.updated_at, "updated_at", "ASC", relation10, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_UPDATED_AT_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repository.attributes.updated_at, "updated_at", "DESC", relation10, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_VISIBILITY_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repository.attributes.visibility, "visibility", "ASC", relation10, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_VISIBILITY_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repository.attributes.visibility, "visibility", "DESC", relation10, spec_resource_repositoryPgResource, $select);
      },
      REPOSITORY_COLLABORATORS_COUNT_ASC($select) {
        pgAggregatesApplyOrderByTotalCount("ASC", relation11, spec_resource_repository_collaboratorPgResource, $select);
      },
      REPOSITORY_COLLABORATORS_COUNT_DESC($select) {
        pgAggregatesApplyOrderByTotalCount("DESC", relation11, spec_resource_repository_collaboratorPgResource, $select);
      },
      REPOSITORY_COLLABORATORS_DISTINCT_COUNT_CREATED_AT_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryCollaborator.attributes.created_at, "created_at", "ASC", relation11, spec_resource_repository_collaboratorPgResource, $select);
      },
      REPOSITORY_COLLABORATORS_DISTINCT_COUNT_CREATED_AT_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryCollaborator.attributes.created_at, "created_at", "DESC", relation11, spec_resource_repository_collaboratorPgResource, $select);
      },
      REPOSITORY_COLLABORATORS_DISTINCT_COUNT_PERMISSION_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryCollaborator.attributes.permission, "permission", "ASC", relation11, spec_resource_repository_collaboratorPgResource, $select);
      },
      REPOSITORY_COLLABORATORS_DISTINCT_COUNT_PERMISSION_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryCollaborator.attributes.permission, "permission", "DESC", relation11, spec_resource_repository_collaboratorPgResource, $select);
      },
      REPOSITORY_COLLABORATORS_DISTINCT_COUNT_REPOSITORY_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryCollaborator.attributes.repository_id, "repository_id", "ASC", relation11, spec_resource_repository_collaboratorPgResource, $select);
      },
      REPOSITORY_COLLABORATORS_DISTINCT_COUNT_REPOSITORY_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryCollaborator.attributes.repository_id, "repository_id", "DESC", relation11, spec_resource_repository_collaboratorPgResource, $select);
      },
      REPOSITORY_COLLABORATORS_DISTINCT_COUNT_UPDATED_AT_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryCollaborator.attributes.updated_at, "updated_at", "ASC", relation11, spec_resource_repository_collaboratorPgResource, $select);
      },
      REPOSITORY_COLLABORATORS_DISTINCT_COUNT_UPDATED_AT_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryCollaborator.attributes.updated_at, "updated_at", "DESC", relation11, spec_resource_repository_collaboratorPgResource, $select);
      },
      REPOSITORY_COLLABORATORS_DISTINCT_COUNT_USER_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryCollaborator.attributes.user_id, "user_id", "ASC", relation11, spec_resource_repository_collaboratorPgResource, $select);
      },
      REPOSITORY_COLLABORATORS_DISTINCT_COUNT_USER_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_repositoryCollaborator.attributes.user_id, "user_id", "DESC", relation11, spec_resource_repository_collaboratorPgResource, $select);
      },
      REVIEWED_PULL_REQUEST_REVIEWS_COUNT_ASC($select) {
        pgAggregatesApplyOrderByTotalCount("ASC", relation13, spec_resource_pull_request_reviewPgResource, $select);
      },
      REVIEWED_PULL_REQUEST_REVIEWS_COUNT_DESC($select) {
        pgAggregatesApplyOrderByTotalCount("DESC", relation13, spec_resource_pull_request_reviewPgResource, $select);
      },
      REVIEWED_PULL_REQUEST_REVIEWS_DISTINCT_COUNT_BODY_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestReview.attributes.body, "body", "ASC", relation13, spec_resource_pull_request_reviewPgResource, $select);
      },
      REVIEWED_PULL_REQUEST_REVIEWS_DISTINCT_COUNT_BODY_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestReview.attributes.body, "body", "DESC", relation13, spec_resource_pull_request_reviewPgResource, $select);
      },
      REVIEWED_PULL_REQUEST_REVIEWS_DISTINCT_COUNT_CREATED_AT_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestReview.attributes.created_at, "created_at", "ASC", relation13, spec_resource_pull_request_reviewPgResource, $select);
      },
      REVIEWED_PULL_REQUEST_REVIEWS_DISTINCT_COUNT_CREATED_AT_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestReview.attributes.created_at, "created_at", "DESC", relation13, spec_resource_pull_request_reviewPgResource, $select);
      },
      REVIEWED_PULL_REQUEST_REVIEWS_DISTINCT_COUNT_PULL_REQUEST_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestReview.attributes.pull_request_id, "pull_request_id", "ASC", relation13, spec_resource_pull_request_reviewPgResource, $select);
      },
      REVIEWED_PULL_REQUEST_REVIEWS_DISTINCT_COUNT_PULL_REQUEST_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestReview.attributes.pull_request_id, "pull_request_id", "DESC", relation13, spec_resource_pull_request_reviewPgResource, $select);
      },
      REVIEWED_PULL_REQUEST_REVIEWS_DISTINCT_COUNT_REVIEWER_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestReview.attributes.reviewer_id, "reviewer_id", "ASC", relation13, spec_resource_pull_request_reviewPgResource, $select);
      },
      REVIEWED_PULL_REQUEST_REVIEWS_DISTINCT_COUNT_REVIEWER_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestReview.attributes.reviewer_id, "reviewer_id", "DESC", relation13, spec_resource_pull_request_reviewPgResource, $select);
      },
      REVIEWED_PULL_REQUEST_REVIEWS_DISTINCT_COUNT_ROW_ID_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestReview.attributes.id, "id", "ASC", relation13, spec_resource_pull_request_reviewPgResource, $select);
      },
      REVIEWED_PULL_REQUEST_REVIEWS_DISTINCT_COUNT_ROW_ID_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestReview.attributes.id, "id", "DESC", relation13, spec_resource_pull_request_reviewPgResource, $select);
      },
      REVIEWED_PULL_REQUEST_REVIEWS_DISTINCT_COUNT_STATE_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestReview.attributes.state, "state", "ASC", relation13, spec_resource_pull_request_reviewPgResource, $select);
      },
      REVIEWED_PULL_REQUEST_REVIEWS_DISTINCT_COUNT_STATE_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestReview.attributes.state, "state", "DESC", relation13, spec_resource_pull_request_reviewPgResource, $select);
      },
      REVIEWED_PULL_REQUEST_REVIEWS_DISTINCT_COUNT_SUBMITTED_AT_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestReview.attributes.submitted_at, "submitted_at", "ASC", relation13, spec_resource_pull_request_reviewPgResource, $select);
      },
      REVIEWED_PULL_REQUEST_REVIEWS_DISTINCT_COUNT_SUBMITTED_AT_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestReview.attributes.submitted_at, "submitted_at", "DESC", relation13, spec_resource_pull_request_reviewPgResource, $select);
      },
      REVIEWED_PULL_REQUEST_REVIEWS_DISTINCT_COUNT_UPDATED_AT_ASC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestReview.attributes.updated_at, "updated_at", "ASC", relation13, spec_resource_pull_request_reviewPgResource, $select);
      },
      REVIEWED_PULL_REQUEST_REVIEWS_DISTINCT_COUNT_UPDATED_AT_DESC($select) {
        pgAggregatesApplyOrderByAttribute(pgAggregateSpec_distinctCount, spec_pullRequestReview.attributes.updated_at, "updated_at", "DESC", relation13, spec_resource_pull_request_reviewPgResource, $select);
      },
      ROW_ID_ASC: RepositoryOrderBy_ROW_ID_ASCApply,
      ROW_ID_DESC: RepositoryOrderBy_ROW_ID_DESCApply,
      UPDATED_AT_ASC: RepositoryOrderBy_UPDATED_AT_ASCApply,
      UPDATED_AT_DESC: RepositoryOrderBy_UPDATED_AT_DESCApply,
      USERNAME_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "username",
          direction: "ASC"
        });
        queryBuilder.setOrderIsUnique();
      },
      USERNAME_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "username",
          direction: "DESC"
        });
        queryBuilder.setOrderIsUnique();
      }
    }
  }
};
export const schema = makeGrafastSchema({
  typeDefs: typeDefs,
  objects: objects,
  interfaces: interfaces,
  inputObjects: inputObjects,
  scalars: scalars,
  enums: enums
});