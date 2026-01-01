// @ts-nocheck
import { PgBooleanFilter, PgCondition, PgDeleteSingleStep, PgExecutor, PgOrFilter, TYPES, assertPgClassSingleStep, enumCodec, listOfCodec, makeRegistry, pgDeleteSingle, pgInsertSingle, pgSelectFromRecord, pgUpdateSingle, pgWhereConditionSpecListToSQL, recordCodec, sqlValueWithCodec } from "@dataplan/pg";
import { ConnectionStep, EdgeStep, ExecutableStep, Modifier, ObjectStep, __ValueStep, access, assertExecutableStep, bakedInputRuntime, connection, constant, context, createObjectAndApplyChildren, first, get as get2, inhibitOnNull, inspect, isExecutableStep, lambda, list, makeDecodeNodeId, makeGrafastSchema, object, rootValue, sideEffect, specFromNodeId } from "grafast";
import { GraphQLError, Kind } from "graphql";
import { sql } from "pg-sql2";
const nodeIdHandler_Query = {
  typeName: "Query",
  codec: {
    name: "raw",
    encode: Object.assign(function rawEncode(value) {
      return typeof value === "string" ? value : null;
    }, {
      isSyncAndSafe: true
    }),
    decode: Object.assign(function rawDecode(value) {
      return typeof value === "string" ? value : null;
    }, {
      isSyncAndSafe: true
    })
  },
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
};
const nodeIdCodecs_base64JSON_base64JSON = {
  name: "base64JSON",
  encode: (() => {
    function base64JSONEncode(value) {
      return Buffer.from(JSON.stringify(value), "utf8").toString("base64");
    }
    base64JSONEncode.isSyncAndSafe = !0;
    return base64JSONEncode;
  })(),
  decode: (() => {
    function base64JSONDecode(value) {
      return JSON.parse(Buffer.from(value, "base64").toString("utf8"));
    }
    base64JSONDecode.isSyncAndSafe = !0;
    return base64JSONDecode;
  })()
};
const nodeIdCodecs = {
  __proto__: null,
  raw: nodeIdHandler_Query.codec,
  base64JSON: nodeIdCodecs_base64JSON_base64JSON,
  pipeString: {
    name: "pipeString",
    encode: Object.assign(function pipeStringEncode(value) {
      return Array.isArray(value) ? value.join("|") : null;
    }, {
      isSyncAndSafe: true
    }),
    decode: Object.assign(function pipeStringDecode(value) {
      return typeof value === "string" ? value.split("|") : null;
    }, {
      isSyncAndSafe: true
    })
  }
};
const executor = new PgExecutor({
  name: "main",
  context() {
    const ctx = context();
    return object({
      pgSettings: "pgSettings" != null ? ctx.get("pgSettings") : constant(null),
      withPgClient: ctx.get("withPgClient")
    });
  }
});
const organizationMemberIdentifier = sql.identifier("public", "organization_member");
const roleCodec = enumCodec({
  name: "role",
  identifier: sql.identifier("public", "role"),
  values: ["owner", "admin", "member"],
  description: undefined,
  extensions: {
    oid: "158182",
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "role"
    },
    tags: {
      __proto__: null
    }
  }
});
const spec_organizationMember = {
  name: "organizationMember",
  identifier: organizationMemberIdentifier,
  attributes: {
    __proto__: null,
    organization_id: {
      description: undefined,
      codec: TYPES.uuid,
      notNull: true,
      hasDefault: false,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    user_id: {
      description: undefined,
      codec: TYPES.uuid,
      notNull: true,
      hasDefault: false,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    role: {
      description: undefined,
      codec: roleCodec,
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
      description: undefined,
      codec: TYPES.timestamptz,
      notNull: true,
      hasDefault: true,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    updated_at: {
      description: undefined,
      codec: TYPES.timestamptz,
      notNull: true,
      hasDefault: true,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    }
  },
  description: undefined,
  extensions: {
    oid: "158224",
    isTableLike: true,
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "organization_member"
    },
    tags: {
      __proto__: null
    }
  },
  executor: executor
};
const organizationMemberCodec = recordCodec(spec_organizationMember);
const repositoryCollaboratorIdentifier = sql.identifier("public", "repository_collaborator");
const permissionCodec = enumCodec({
  name: "permission",
  identifier: sql.identifier("public", "permission"),
  values: ["read", "write", "admin"],
  description: undefined,
  extensions: {
    oid: "158196",
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "permission"
    },
    tags: {
      __proto__: null
    }
  }
});
const spec_repositoryCollaborator = {
  name: "repositoryCollaborator",
  identifier: repositoryCollaboratorIdentifier,
  attributes: {
    __proto__: null,
    repository_id: {
      description: undefined,
      codec: TYPES.uuid,
      notNull: true,
      hasDefault: false,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    user_id: {
      description: undefined,
      codec: TYPES.uuid,
      notNull: true,
      hasDefault: false,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    permission: {
      description: undefined,
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
      description: undefined,
      codec: TYPES.timestamptz,
      notNull: true,
      hasDefault: true,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    updated_at: {
      description: undefined,
      codec: TYPES.timestamptz,
      notNull: true,
      hasDefault: true,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    }
  },
  description: undefined,
  extensions: {
    oid: "158257",
    isTableLike: true,
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "repository_collaborator"
    },
    tags: {
      __proto__: null
    }
  },
  executor: executor
};
const repositoryCollaboratorCodec = recordCodec(spec_repositoryCollaborator);
const userIdentifier = sql.identifier("public", "user");
const spec_user = {
  name: "user",
  identifier: userIdentifier,
  attributes: {
    __proto__: null,
    id: {
      description: undefined,
      codec: TYPES.uuid,
      notNull: true,
      hasDefault: true,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    identity_provider_id: {
      description: undefined,
      codec: TYPES.uuid,
      notNull: true,
      hasDefault: false,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    name: {
      description: undefined,
      codec: TYPES.text,
      notNull: true,
      hasDefault: false,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    avatar_url: {
      description: undefined,
      codec: TYPES.text,
      notNull: false,
      hasDefault: false,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    email: {
      description: undefined,
      codec: TYPES.text,
      notNull: true,
      hasDefault: false,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    created_at: {
      description: undefined,
      codec: TYPES.timestamptz,
      notNull: true,
      hasDefault: true,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    updated_at: {
      description: undefined,
      codec: TYPES.timestamptz,
      notNull: true,
      hasDefault: true,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    username: {
      description: undefined,
      codec: TYPES.text,
      notNull: true,
      hasDefault: false,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    bio: {
      description: undefined,
      codec: TYPES.text,
      notNull: false,
      hasDefault: false,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    }
  },
  description: undefined,
  extensions: {
    oid: "158153",
    isTableLike: true,
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "user"
    },
    tags: {
      __proto__: null
    }
  },
  executor: executor
};
const userCodec = recordCodec(spec_user);
const visibilityCodec = enumCodec({
  name: "visibility",
  identifier: sql.identifier("public", "visibility"),
  values: ["public", "private"],
  description: undefined,
  extensions: {
    oid: "158190",
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "visibility"
    },
    tags: {
      __proto__: null
    }
  }
});
const tierCodec = enumCodec({
  name: "tier",
  identifier: sql.identifier("public", "tier"),
  values: ["free", "basic", "team"],
  description: undefined,
  extensions: {
    oid: "158174",
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "tier"
    },
    tags: {
      __proto__: null
    }
  }
});
const organizationIdentifier = sql.identifier("public", "organization");
const spec_organization = {
  name: "organization",
  identifier: organizationIdentifier,
  attributes: {
    __proto__: null,
    id: {
      description: undefined,
      codec: TYPES.uuid,
      notNull: true,
      hasDefault: true,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    name: {
      description: undefined,
      codec: TYPES.text,
      notNull: true,
      hasDefault: false,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    slug: {
      description: undefined,
      codec: TYPES.text,
      notNull: true,
      hasDefault: false,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    description: {
      description: undefined,
      codec: TYPES.text,
      notNull: false,
      hasDefault: false,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    avatar_url: {
      description: undefined,
      codec: TYPES.text,
      notNull: false,
      hasDefault: false,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    tier: {
      description: undefined,
      codec: tierCodec,
      notNull: true,
      hasDefault: true,
      extensions: {
        tags: {
          behavior: "-insert -update +orderBy"
        },
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    stripe_customer_id: {
      description: undefined,
      codec: TYPES.text,
      notNull: false,
      hasDefault: false,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    stripe_subscription_id: {
      description: undefined,
      codec: TYPES.text,
      notNull: false,
      hasDefault: false,
      extensions: {
        tags: {
          behavior: "-insert -update"
        },
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    created_at: {
      description: undefined,
      codec: TYPES.timestamptz,
      notNull: true,
      hasDefault: true,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    updated_at: {
      description: undefined,
      codec: TYPES.timestamptz,
      notNull: true,
      hasDefault: true,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    }
  },
  description: undefined,
  extensions: {
    oid: "158205",
    isTableLike: true,
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "organization"
    },
    tags: {
      __proto__: null
    }
  },
  executor: executor
};
const organizationCodec = recordCodec(spec_organization);
const repositoryIdentifier = sql.identifier("public", "repository");
const spec_repository = {
  name: "repository",
  identifier: repositoryIdentifier,
  attributes: {
    __proto__: null,
    id: {
      description: undefined,
      codec: TYPES.uuid,
      notNull: true,
      hasDefault: true,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    owner_id: {
      description: undefined,
      codec: TYPES.uuid,
      notNull: true,
      hasDefault: false,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    organization_id: {
      description: undefined,
      codec: TYPES.uuid,
      notNull: false,
      hasDefault: false,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    name: {
      description: undefined,
      codec: TYPES.text,
      notNull: true,
      hasDefault: false,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    slug: {
      description: undefined,
      codec: TYPES.text,
      notNull: true,
      hasDefault: false,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    description: {
      description: undefined,
      codec: TYPES.text,
      notNull: false,
      hasDefault: false,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    visibility: {
      description: undefined,
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
      description: undefined,
      codec: TYPES.text,
      notNull: true,
      hasDefault: true,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    created_at: {
      description: undefined,
      codec: TYPES.timestamptz,
      notNull: true,
      hasDefault: true,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    updated_at: {
      description: undefined,
      codec: TYPES.timestamptz,
      notNull: true,
      hasDefault: true,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    }
  },
  description: undefined,
  extensions: {
    oid: "158237",
    isTableLike: true,
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "repository"
    },
    tags: {
      __proto__: null
    }
  },
  executor: executor
};
const repositoryCodec = recordCodec(spec_repository);
const organization_memberUniques = [{
  isPrimary: true,
  attributes: ["organization_id", "user_id"],
  description: undefined,
  extensions: {
    tags: {
      __proto__: null
    }
  }
}];
const registryConfig_pgResources_organization_member_organization_member = {
  executor: executor,
  name: "organization_member",
  identifier: "main.public.organization_member",
  from: organizationMemberIdentifier,
  codec: organizationMemberCodec,
  uniques: organization_memberUniques,
  isVirtual: false,
  description: undefined,
  extensions: {
    description: undefined,
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "organization_member"
    },
    isInsertable: true,
    isUpdatable: true,
    isDeletable: true,
    tags: {},
    canSelect: true,
    canInsert: true,
    canUpdate: true,
    canDelete: true
  }
};
const repository_collaboratorUniques = [{
  isPrimary: true,
  attributes: ["repository_id", "user_id"],
  description: undefined,
  extensions: {
    tags: {
      __proto__: null
    }
  }
}];
const registryConfig_pgResources_repository_collaborator_repository_collaborator = {
  executor: executor,
  name: "repository_collaborator",
  identifier: "main.public.repository_collaborator",
  from: repositoryCollaboratorIdentifier,
  codec: repositoryCollaboratorCodec,
  uniques: repository_collaboratorUniques,
  isVirtual: false,
  description: undefined,
  extensions: {
    description: undefined,
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "repository_collaborator"
    },
    isInsertable: true,
    isUpdatable: true,
    isDeletable: true,
    tags: {},
    canSelect: true,
    canInsert: true,
    canUpdate: true,
    canDelete: true
  }
};
const userUniques = [{
  isPrimary: true,
  attributes: ["id"],
  description: undefined,
  extensions: {
    tags: {
      __proto__: null
    }
  }
}, {
  isPrimary: false,
  attributes: ["email"],
  description: undefined,
  extensions: {
    tags: {
      __proto__: null,
      behavior: ["-update", "-delete"]
    }
  }
}, {
  isPrimary: false,
  attributes: ["identity_provider_id"],
  description: undefined,
  extensions: {
    tags: {
      __proto__: null,
      behavior: ["-update", "-delete"]
    }
  }
}, {
  isPrimary: false,
  attributes: ["username"],
  description: undefined,
  extensions: {
    tags: {
      __proto__: null,
      behavior: ["-update", "-delete"]
    }
  }
}];
const registryConfig_pgResources_user_user = {
  executor: executor,
  name: "user",
  identifier: "main.public.user",
  from: userIdentifier,
  codec: userCodec,
  uniques: userUniques,
  isVirtual: false,
  description: undefined,
  extensions: {
    description: undefined,
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "user"
    },
    isInsertable: true,
    isUpdatable: true,
    isDeletable: true,
    tags: {},
    canSelect: true,
    canInsert: true,
    canUpdate: true,
    canDelete: true
  }
};
const repositoryUniques = [{
  isPrimary: true,
  attributes: ["id"],
  description: undefined,
  extensions: {
    tags: {
      __proto__: null
    }
  }
}];
const registryConfig_pgResources_repository_repository = {
  executor: executor,
  name: "repository",
  identifier: "main.public.repository",
  from: repositoryIdentifier,
  codec: repositoryCodec,
  uniques: repositoryUniques,
  isVirtual: false,
  description: undefined,
  extensions: {
    description: undefined,
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "repository"
    },
    isInsertable: true,
    isUpdatable: true,
    isDeletable: true,
    tags: {},
    canSelect: true,
    canInsert: true,
    canUpdate: true,
    canDelete: true
  }
};
const organizationUniques = [{
  isPrimary: true,
  attributes: ["id"],
  description: undefined,
  extensions: {
    tags: {
      __proto__: null
    }
  }
}, {
  isPrimary: false,
  attributes: ["slug"],
  description: undefined,
  extensions: {
    tags: {
      __proto__: null,
      behavior: ["-update", "-delete"]
    }
  }
}];
const registryConfig_pgResources_organization_organization = {
  executor: executor,
  name: "organization",
  identifier: "main.public.organization",
  from: organizationIdentifier,
  codec: organizationCodec,
  uniques: organizationUniques,
  isVirtual: false,
  description: undefined,
  extensions: {
    description: undefined,
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "organization"
    },
    isInsertable: true,
    isUpdatable: true,
    isDeletable: true,
    tags: {},
    canSelect: true,
    canInsert: true,
    canUpdate: true,
    canDelete: true
  }
};
const registryConfig = {
  pgExecutors: {
    __proto__: null,
    main: executor
  },
  pgCodecs: {
    __proto__: null,
    organizationMember: organizationMemberCodec,
    uuid: TYPES.uuid,
    role: roleCodec,
    timestamptz: TYPES.timestamptz,
    repositoryCollaborator: repositoryCollaboratorCodec,
    permission: permissionCodec,
    user: userCodec,
    text: TYPES.text,
    visibility: visibilityCodec,
    tier: tierCodec,
    organization: organizationCodec,
    repository: repositoryCodec
  },
  pgResources: {
    __proto__: null,
    organization_member: registryConfig_pgResources_organization_member_organization_member,
    repository_collaborator: registryConfig_pgResources_repository_collaborator_repository_collaborator,
    user: registryConfig_pgResources_user_user,
    repository: registryConfig_pgResources_repository_repository,
    organization: registryConfig_pgResources_organization_organization
  },
  pgRelations: {
    __proto__: null,
    organization: {
      __proto__: null,
      organizationMembersByTheirOrganizationId: {
        localCodec: organizationCodec,
        remoteResourceOptions: registryConfig_pgResources_organization_member_organization_member,
        localCodecPolymorphicTypes: undefined,
        localAttributes: ["id"],
        remoteAttributes: ["organization_id"],
        isUnique: false,
        isReferencee: true,
        description: undefined,
        extensions: {
          tags: {
            behavior: []
          }
        }
      },
      repositoriesByTheirOrganizationId: {
        localCodec: organizationCodec,
        remoteResourceOptions: registryConfig_pgResources_repository_repository,
        localCodecPolymorphicTypes: undefined,
        localAttributes: ["id"],
        remoteAttributes: ["organization_id"],
        isUnique: false,
        isReferencee: true,
        description: undefined,
        extensions: {
          tags: {
            behavior: []
          }
        }
      }
    },
    organizationMember: {
      __proto__: null,
      organizationByMyOrganizationId: {
        localCodec: organizationMemberCodec,
        remoteResourceOptions: registryConfig_pgResources_organization_organization,
        localCodecPolymorphicTypes: undefined,
        localAttributes: ["organization_id"],
        remoteAttributes: ["id"],
        isUnique: true,
        isReferencee: false,
        description: undefined,
        extensions: {
          tags: {
            behavior: []
          }
        }
      },
      userByMyUserId: {
        localCodec: organizationMemberCodec,
        remoteResourceOptions: registryConfig_pgResources_user_user,
        localCodecPolymorphicTypes: undefined,
        localAttributes: ["user_id"],
        remoteAttributes: ["id"],
        isUnique: true,
        isReferencee: false,
        description: undefined,
        extensions: {
          tags: {
            behavior: []
          }
        }
      }
    },
    repository: {
      __proto__: null,
      organizationByMyOrganizationId: {
        localCodec: repositoryCodec,
        remoteResourceOptions: registryConfig_pgResources_organization_organization,
        localCodecPolymorphicTypes: undefined,
        localAttributes: ["organization_id"],
        remoteAttributes: ["id"],
        isUnique: true,
        isReferencee: false,
        description: undefined,
        extensions: {
          tags: {
            behavior: []
          }
        }
      },
      userByMyOwnerId: {
        localCodec: repositoryCodec,
        remoteResourceOptions: registryConfig_pgResources_user_user,
        localCodecPolymorphicTypes: undefined,
        localAttributes: ["owner_id"],
        remoteAttributes: ["id"],
        isUnique: true,
        isReferencee: false,
        description: undefined,
        extensions: {
          tags: {
            behavior: []
          }
        }
      },
      repositoryCollaboratorsByTheirRepositoryId: {
        localCodec: repositoryCodec,
        remoteResourceOptions: registryConfig_pgResources_repository_collaborator_repository_collaborator,
        localCodecPolymorphicTypes: undefined,
        localAttributes: ["id"],
        remoteAttributes: ["repository_id"],
        isUnique: false,
        isReferencee: true,
        description: undefined,
        extensions: {
          tags: {
            behavior: []
          }
        }
      }
    },
    repositoryCollaborator: {
      __proto__: null,
      repositoryByMyRepositoryId: {
        localCodec: repositoryCollaboratorCodec,
        remoteResourceOptions: registryConfig_pgResources_repository_repository,
        localCodecPolymorphicTypes: undefined,
        localAttributes: ["repository_id"],
        remoteAttributes: ["id"],
        isUnique: true,
        isReferencee: false,
        description: undefined,
        extensions: {
          tags: {
            behavior: []
          }
        }
      },
      userByMyUserId: {
        localCodec: repositoryCollaboratorCodec,
        remoteResourceOptions: registryConfig_pgResources_user_user,
        localCodecPolymorphicTypes: undefined,
        localAttributes: ["user_id"],
        remoteAttributes: ["id"],
        isUnique: true,
        isReferencee: false,
        description: undefined,
        extensions: {
          tags: {
            behavior: []
          }
        }
      }
    },
    user: {
      __proto__: null,
      organizationMembersByTheirUserId: {
        localCodec: userCodec,
        remoteResourceOptions: registryConfig_pgResources_organization_member_organization_member,
        localCodecPolymorphicTypes: undefined,
        localAttributes: ["id"],
        remoteAttributes: ["user_id"],
        isUnique: false,
        isReferencee: true,
        description: undefined,
        extensions: {
          tags: {
            behavior: []
          }
        }
      },
      repositoriesByTheirOwnerId: {
        localCodec: userCodec,
        remoteResourceOptions: registryConfig_pgResources_repository_repository,
        localCodecPolymorphicTypes: undefined,
        localAttributes: ["id"],
        remoteAttributes: ["owner_id"],
        isUnique: false,
        isReferencee: true,
        description: undefined,
        extensions: {
          tags: {
            behavior: []
          }
        }
      },
      repositoryCollaboratorsByTheirUserId: {
        localCodec: userCodec,
        remoteResourceOptions: registryConfig_pgResources_repository_collaborator_repository_collaborator,
        localCodecPolymorphicTypes: undefined,
        localAttributes: ["id"],
        remoteAttributes: ["user_id"],
        isUnique: false,
        isReferencee: true,
        description: undefined,
        extensions: {
          tags: {
            behavior: []
          }
        }
      }
    }
  }
};
const registry = makeRegistry(registryConfig);
const resource_organization_memberPgResource = registry.pgResources["organization_member"];
const resource_repository_collaboratorPgResource = registry.pgResources["repository_collaborator"];
const resource_userPgResource = registry.pgResources["user"];
const resource_repositoryPgResource = registry.pgResources["repository"];
const resource_organizationPgResource = registry.pgResources["organization"];
const nodeIdHandler_OrganizationMember = {
  typeName: "OrganizationMember",
  codec: nodeIdCodecs_base64JSON_base64JSON,
  deprecationReason: undefined,
  plan($record) {
    return list([constant("OrganizationMember", false), $record.get("organization_id"), $record.get("user_id")]);
  },
  getSpec($list) {
    return {
      organization_id: inhibitOnNull(access($list, [1])),
      user_id: inhibitOnNull(access($list, [2]))
    };
  },
  getIdentifiers(value) {
    return value.slice(1);
  },
  get(spec) {
    return resource_organization_memberPgResource.get(spec);
  },
  match(obj) {
    return obj[0] === "OrganizationMember";
  }
};
const specForHandlerCache = new Map();
function specForHandler(handler) {
  const existing = specForHandlerCache.get(handler);
  if (existing) return existing;
  function spec(nodeId) {
    if (nodeId == null) return null;
    try {
      const specifier = handler.codec.decode(nodeId);
      if (handler.match(specifier)) return specifier;
    } catch {}
    return null;
  }
  spec.displayName = `specifier_${handler.typeName}_${handler.codec.name}`;
  spec.isSyncAndSafe = !0;
  specForHandlerCache.set(handler, spec);
  return spec;
}
const nodeFetcher_OrganizationMember = $nodeId => {
  const $decoded = lambda($nodeId, specForHandler(nodeIdHandler_OrganizationMember));
  return nodeIdHandler_OrganizationMember.get(nodeIdHandler_OrganizationMember.getSpec($decoded));
};
const nodeIdHandler_RepositoryCollaborator = {
  typeName: "RepositoryCollaborator",
  codec: nodeIdCodecs_base64JSON_base64JSON,
  deprecationReason: undefined,
  plan($record) {
    return list([constant("RepositoryCollaborator", false), $record.get("repository_id"), $record.get("user_id")]);
  },
  getSpec($list) {
    return {
      repository_id: inhibitOnNull(access($list, [1])),
      user_id: inhibitOnNull(access($list, [2]))
    };
  },
  getIdentifiers(value) {
    return value.slice(1);
  },
  get(spec) {
    return resource_repository_collaboratorPgResource.get(spec);
  },
  match(obj) {
    return obj[0] === "RepositoryCollaborator";
  }
};
const nodeFetcher_RepositoryCollaborator = $nodeId => {
  const $decoded = lambda($nodeId, specForHandler(nodeIdHandler_RepositoryCollaborator));
  return nodeIdHandler_RepositoryCollaborator.get(nodeIdHandler_RepositoryCollaborator.getSpec($decoded));
};
const nodeIdHandler_User = {
  typeName: "User",
  codec: nodeIdCodecs_base64JSON_base64JSON,
  deprecationReason: undefined,
  plan($record) {
    return list([constant("User", false), $record.get("id")]);
  },
  getSpec($list) {
    return {
      id: inhibitOnNull(access($list, [1]))
    };
  },
  getIdentifiers(value) {
    return value.slice(1);
  },
  get(spec) {
    return resource_userPgResource.get(spec);
  },
  match(obj) {
    return obj[0] === "User";
  }
};
const nodeFetcher_User = $nodeId => {
  const $decoded = lambda($nodeId, specForHandler(nodeIdHandler_User));
  return nodeIdHandler_User.get(nodeIdHandler_User.getSpec($decoded));
};
const nodeIdHandler_Repository = {
  typeName: "Repository",
  codec: nodeIdCodecs_base64JSON_base64JSON,
  deprecationReason: undefined,
  plan($record) {
    return list([constant("Repository", false), $record.get("id")]);
  },
  getSpec($list) {
    return {
      id: inhibitOnNull(access($list, [1]))
    };
  },
  getIdentifiers(value) {
    return value.slice(1);
  },
  get(spec) {
    return resource_repositoryPgResource.get(spec);
  },
  match(obj) {
    return obj[0] === "Repository";
  }
};
const nodeFetcher_Repository = $nodeId => {
  const $decoded = lambda($nodeId, specForHandler(nodeIdHandler_Repository));
  return nodeIdHandler_Repository.get(nodeIdHandler_Repository.getSpec($decoded));
};
const nodeIdHandler_Organization = {
  typeName: "Organization",
  codec: nodeIdCodecs_base64JSON_base64JSON,
  deprecationReason: undefined,
  plan($record) {
    return list([constant("Organization", false), $record.get("id")]);
  },
  getSpec($list) {
    return {
      id: inhibitOnNull(access($list, [1]))
    };
  },
  getIdentifiers(value) {
    return value.slice(1);
  },
  get(spec) {
    return resource_organizationPgResource.get(spec);
  },
  match(obj) {
    return obj[0] === "Organization";
  }
};
const nodeFetcher_Organization = $nodeId => {
  const $decoded = lambda($nodeId, specForHandler(nodeIdHandler_Organization));
  return nodeIdHandler_Organization.get(nodeIdHandler_Organization.getSpec($decoded));
};
function qbWhereBuilder(qb) {
  return qb.whereBuilder();
}
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
function assertAllowed2(value, mode) {
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
function assertAllowed3(value, mode) {
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
function assertAllowed4(value, mode) {
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
function assertAllowed5(value, mode) {
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
const nodeIdHandlerByTypeName = {
  __proto__: null,
  Query: nodeIdHandler_Query,
  OrganizationMember: nodeIdHandler_OrganizationMember,
  RepositoryCollaborator: nodeIdHandler_RepositoryCollaborator,
  User: nodeIdHandler_User,
  Repository: nodeIdHandler_Repository,
  Organization: nodeIdHandler_Organization
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
function UUIDSerialize(value) {
  return "" + value;
}
const coerce = string => {
  if (!/^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(string)) throw new GraphQLError("Invalid UUID, expected 32 hexadecimal characters, optionally with hyphens");
  return string;
};
function assertAllowed6(value, mode) {
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
function assertAllowed7(value, mode) {
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
const dataTypeToAggregateTypeMap = {};
const spec = {
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
const aggregateGroupBySpec = {
  id: "truncated-to-hour",
  isSuitableType(codec) {
    return codec === TYPES.timestamp || codec === TYPES.timestamptz;
  },
  sqlWrap(sqlFrag) {
    return sql`date_trunc('hour', ${sqlFrag})`;
  },
  sqlWrapCodec(codec) {
    return codec;
  }
};
const aggregateGroupBySpec2 = {
  id: "truncated-to-day",
  isSuitableType(codec) {
    return codec === TYPES.timestamp || codec === TYPES.timestamptz;
  },
  sqlWrap(sqlFrag) {
    return sql`date_trunc('day', ${sqlFrag})`;
  },
  sqlWrapCodec(codec) {
    return codec;
  }
};
const isIntervalLike = codec => !!codec.extensions?.isIntervalLike;
const isNumberLike = codec => !!codec.extensions?.isNumberLike;
const aggregateSpec_isSuitableType = codec => isIntervalLike(codec) || isNumberLike(codec);
const dataTypeToAggregateTypeMap2 = {
  "20": TYPES.numeric,
  "21": TYPES.bigint,
  "23": TYPES.bigint,
  "700": TYPES.float4,
  "701": TYPES.float,
  "790": TYPES.money,
  "1186": TYPES.interval
};
const aggregateSpec = {
  id: "sum",
  humanLabel: "sum",
  HumanLabel: "Sum",
  isSuitableType: aggregateSpec_isSuitableType,
  sqlAggregateWrap(sqlFrag) {
    return sql`coalesce(sum(${sqlFrag}), '0')`;
  },
  isNonNull: true,
  pgTypeCodecModifier(codec) {
    const oid = codec.extensions?.oid;
    return (oid ? dataTypeToAggregateTypeMap2[oid] : null) ?? TYPES.numeric;
  }
};
const infix = () => sql.fragment`=`;
const infix2 = () => sql.fragment`<>`;
const infix3 = () => sql.fragment`>`;
const infix4 = () => sql.fragment`>=`;
const infix5 = () => sql.fragment`<`;
const infix6 = () => sql.fragment`<=`;
const aggregateSpec2 = {
  id: "min",
  humanLabel: "minimum",
  HumanLabel: "Minimum",
  isSuitableType: aggregateSpec_isSuitableType,
  sqlAggregateWrap(sqlFrag) {
    return sql`min(${sqlFrag})`;
  }
};
const aggregateSpec3 = {
  id: "max",
  humanLabel: "maximum",
  HumanLabel: "Maximum",
  isSuitableType: aggregateSpec_isSuitableType,
  sqlAggregateWrap(sqlFrag) {
    return sql`max(${sqlFrag})`;
  }
};
const dataTypeToAggregateTypeMap3 = {
  "20": TYPES.numeric,
  "21": TYPES.numeric,
  "23": TYPES.numeric,
  "700": TYPES.float,
  "701": TYPES.float,
  "1186": TYPES.interval,
  "1700": TYPES.numeric
};
const aggregateSpec4 = {
  id: "average",
  humanLabel: "mean average",
  HumanLabel: "Mean average",
  isSuitableType: aggregateSpec_isSuitableType,
  sqlAggregateWrap(sqlFrag) {
    return sql`avg(${sqlFrag})`;
  },
  pgTypeCodecModifier(codec) {
    const oid = codec.extensions?.oid;
    return (oid ? dataTypeToAggregateTypeMap3[oid] : null) ?? TYPES.numeric;
  }
};
const dataTypeToAggregateTypeMap4 = {
  "700": TYPES.float,
  "701": TYPES.float
};
const aggregateSpec5 = {
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
const dataTypeToAggregateTypeMap5 = {
  "700": TYPES.float,
  "701": TYPES.float
};
const aggregateSpec6 = {
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
const dataTypeToAggregateTypeMap6 = {
  "700": TYPES.float,
  "701": TYPES.float
};
const aggregateSpec7 = {
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
const dataTypeToAggregateTypeMap7 = {
  "700": TYPES.float,
  "701": TYPES.float
};
const aggregateSpec8 = {
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
const colSpec = {
  fieldName: "organizationId",
  attributeName: "organization_id",
  attribute: spec_organizationMember.attributes.organization_id
};
const colSpec2 = {
  fieldName: "userId",
  attributeName: "user_id",
  attribute: spec_organizationMember.attributes.user_id
};
const colSpec3 = {
  fieldName: "role",
  attributeName: "role",
  attribute: spec_organizationMember.attributes.role
};
const colSpec4 = {
  fieldName: "createdAt",
  attributeName: "created_at",
  attribute: spec_organizationMember.attributes.created_at
};
const colSpec5 = {
  fieldName: "updatedAt",
  attributeName: "updated_at",
  attribute: spec_organizationMember.attributes.updated_at
};
function assertAllowed8(value, mode) {
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
function assertAllowed9(value, mode) {
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
const resolve = (i, _v, input) => sql`${i} ${input ? sql`IS NULL` : sql`IS NOT NULL`}`;
const resolveInputCodec = () => TYPES.boolean;
const resolveSqlValue = () => sql.null;
const resolve2 = (i, v) => sql`${i} = ${v}`;
const forceTextTypesSensitive = [TYPES.citext, TYPES.char, TYPES.bpchar];
function resolveDomains(c) {
  let current = c;
  while (current.domainOfCodec) current = current.domainOfCodec;
  return current;
}
function resolveInputCodec2(c) {
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
function resolveSqlIdentifier(identifier, c) {
  if (c.arrayOfCodec && forceTextTypesSensitive.includes(resolveDomains(c.arrayOfCodec))) return [sql`(${identifier})::text[]`, listOfCodec(TYPES.text, {
    extensions: {
      listItemNonNull: c.extensions?.listItemNonNull
    }
  })];else if (forceTextTypesSensitive.includes(resolveDomains(c))) return [sql`(${identifier})::text`, TYPES.text];else return [identifier, c];
}
const resolve3 = (i, v) => sql`${i} <> ${v}`;
const resolve4 = (i, v) => sql`${i} IS DISTINCT FROM ${v}`;
const resolve5 = (i, v) => sql`${i} IS NOT DISTINCT FROM ${v}`;
const resolve6 = (i, v) => sql`${i} = ANY(${v})`;
function resolveInputCodec3(c) {
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
const resolve7 = (i, v) => sql`${i} <> ALL(${v})`;
const resolve8 = (i, v) => sql`${i} < ${v}`;
const resolve9 = (i, v) => sql`${i} <= ${v}`;
const resolve10 = (i, v) => sql`${i} > ${v}`;
const resolve11 = (i, v) => sql`${i} >= ${v}`;
const resolve12 = (i, _v, input) => sql`${i} ${input ? sql`IS NULL` : sql`IS NOT NULL`}`;
const resolveInputCodec4 = () => TYPES.boolean;
const resolveSqlValue2 = () => sql.null;
const resolve13 = (i, v) => sql`${i} = ${v}`;
const forceTextTypesSensitive2 = [TYPES.citext, TYPES.char, TYPES.bpchar];
function resolveDomains2(c) {
  let current = c;
  while (current.domainOfCodec) current = current.domainOfCodec;
  return current;
}
function resolveInputCodec5(c) {
  if (c.arrayOfCodec) {
    if (forceTextTypesSensitive2.includes(resolveDomains2(c.arrayOfCodec))) return listOfCodec(TYPES.text, {
      extensions: {
        listItemNonNull: c.extensions?.listItemNonNull
      }
    });
    return c;
  } else {
    if (forceTextTypesSensitive2.includes(resolveDomains2(c))) return TYPES.text;
    return c;
  }
}
function resolveSqlIdentifier2(identifier, c) {
  if (c.arrayOfCodec && forceTextTypesSensitive2.includes(resolveDomains2(c.arrayOfCodec))) return [sql`(${identifier})::text[]`, listOfCodec(TYPES.text, {
    extensions: {
      listItemNonNull: c.extensions?.listItemNonNull
    }
  })];else if (forceTextTypesSensitive2.includes(resolveDomains2(c))) return [sql`(${identifier})::text`, TYPES.text];else return [identifier, c];
}
const resolve14 = (i, v) => sql`${i} <> ${v}`;
const resolve15 = (i, v) => sql`${i} IS DISTINCT FROM ${v}`;
const resolve16 = (i, v) => sql`${i} IS NOT DISTINCT FROM ${v}`;
const resolve17 = (i, v) => sql`${i} = ANY(${v})`;
function resolveInputCodec6(c) {
  if (forceTextTypesSensitive2.includes(resolveDomains2(c))) return listOfCodec(TYPES.text, {
    extensions: {
      listItemNonNull: !0
    }
  });else return listOfCodec(c, {
    extensions: {
      listItemNonNull: !0
    }
  });
}
const resolve18 = (i, v) => sql`${i} <> ALL(${v})`;
const resolve19 = (i, v) => sql`${i} < ${v}`;
const resolve20 = (i, v) => sql`${i} <= ${v}`;
const resolve21 = (i, v) => sql`${i} > ${v}`;
const resolve22 = (i, v) => sql`${i} >= ${v}`;
const resolve23 = (i, _v, input) => sql`${i} ${input ? sql`IS NULL` : sql`IS NOT NULL`}`;
const resolveInputCodec7 = () => TYPES.boolean;
const resolveSqlValue3 = () => sql.null;
const resolve24 = (i, v) => sql`${i} = ${v}`;
const forceTextTypesSensitive3 = [TYPES.citext, TYPES.char, TYPES.bpchar];
function resolveDomains3(c) {
  let current = c;
  while (current.domainOfCodec) current = current.domainOfCodec;
  return current;
}
function resolveInputCodec8(c) {
  if (c.arrayOfCodec) {
    if (forceTextTypesSensitive3.includes(resolveDomains3(c.arrayOfCodec))) return listOfCodec(TYPES.text, {
      extensions: {
        listItemNonNull: c.extensions?.listItemNonNull
      }
    });
    return c;
  } else {
    if (forceTextTypesSensitive3.includes(resolveDomains3(c))) return TYPES.text;
    return c;
  }
}
function resolveSqlIdentifier3(identifier, c) {
  if (c.arrayOfCodec && forceTextTypesSensitive3.includes(resolveDomains3(c.arrayOfCodec))) return [sql`(${identifier})::text[]`, listOfCodec(TYPES.text, {
    extensions: {
      listItemNonNull: c.extensions?.listItemNonNull
    }
  })];else if (forceTextTypesSensitive3.includes(resolveDomains3(c))) return [sql`(${identifier})::text`, TYPES.text];else return [identifier, c];
}
const resolve25 = (i, v) => sql`${i} <> ${v}`;
const resolve26 = (i, v) => sql`${i} IS DISTINCT FROM ${v}`;
const resolve27 = (i, v) => sql`${i} IS NOT DISTINCT FROM ${v}`;
const resolve28 = (i, v) => sql`${i} = ANY(${v})`;
function resolveInputCodec9(c) {
  if (forceTextTypesSensitive3.includes(resolveDomains3(c))) return listOfCodec(TYPES.text, {
    extensions: {
      listItemNonNull: !0
    }
  });else return listOfCodec(c, {
    extensions: {
      listItemNonNull: !0
    }
  });
}
const resolve29 = (i, v) => sql`${i} <> ALL(${v})`;
const resolve30 = (i, v) => sql`${i} < ${v}`;
const resolve31 = (i, v) => sql`${i} <= ${v}`;
const resolve32 = (i, v) => sql`${i} > ${v}`;
const resolve33 = (i, v) => sql`${i} >= ${v}`;
const colSpec6 = {
  fieldName: "rowId",
  attributeName: "id",
  attribute: spec_organization.attributes.id
};
const colSpec7 = {
  fieldName: "name",
  attributeName: "name",
  attribute: spec_organization.attributes.name
};
const colSpec8 = {
  fieldName: "slug",
  attributeName: "slug",
  attribute: spec_organization.attributes.slug
};
const colSpec9 = {
  fieldName: "description",
  attributeName: "description",
  attribute: spec_organization.attributes.description
};
const colSpec10 = {
  fieldName: "avatarUrl",
  attributeName: "avatar_url",
  attribute: spec_organization.attributes.avatar_url
};
const colSpec11 = {
  fieldName: "tier",
  attributeName: "tier",
  attribute: spec_organization.attributes.tier
};
const colSpec12 = {
  fieldName: "stripeCustomerId",
  attributeName: "stripe_customer_id",
  attribute: spec_organization.attributes.stripe_customer_id
};
const colSpec13 = {
  fieldName: "stripeSubscriptionId",
  attributeName: "stripe_subscription_id",
  attribute: spec_organization.attributes.stripe_subscription_id
};
const colSpec14 = {
  fieldName: "createdAt",
  attributeName: "created_at",
  attribute: spec_organization.attributes.created_at
};
const colSpec15 = {
  fieldName: "updatedAt",
  attributeName: "updated_at",
  attribute: spec_organization.attributes.updated_at
};
function assertAllowed10(value, mode) {
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
function assertAllowed11(value, mode) {
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
const resolve34 = (i, _v, input) => sql`${i} ${input ? sql`IS NULL` : sql`IS NOT NULL`}`;
const resolveInputCodec10 = () => TYPES.boolean;
const resolveSqlValue4 = () => sql.null;
const resolve35 = (i, v) => sql`${i} = ${v}`;
const forceTextTypesSensitive4 = [TYPES.citext, TYPES.char, TYPES.bpchar];
function resolveDomains4(c) {
  let current = c;
  while (current.domainOfCodec) current = current.domainOfCodec;
  return current;
}
function resolveInputCodec11(c) {
  if (c.arrayOfCodec) {
    if (forceTextTypesSensitive4.includes(resolveDomains4(c.arrayOfCodec))) return listOfCodec(TYPES.text, {
      extensions: {
        listItemNonNull: c.extensions?.listItemNonNull
      }
    });
    return c;
  } else {
    if (forceTextTypesSensitive4.includes(resolveDomains4(c))) return TYPES.text;
    return c;
  }
}
function resolveSqlIdentifier4(identifier, c) {
  if (c.arrayOfCodec && forceTextTypesSensitive4.includes(resolveDomains4(c.arrayOfCodec))) return [sql`(${identifier})::text[]`, listOfCodec(TYPES.text, {
    extensions: {
      listItemNonNull: c.extensions?.listItemNonNull
    }
  })];else if (forceTextTypesSensitive4.includes(resolveDomains4(c))) return [sql`(${identifier})::text`, TYPES.text];else return [identifier, c];
}
const resolve36 = (i, v) => sql`${i} <> ${v}`;
const resolve37 = (i, v) => sql`${i} IS DISTINCT FROM ${v}`;
const resolve38 = (i, v) => sql`${i} IS NOT DISTINCT FROM ${v}`;
const resolve39 = (i, v) => sql`${i} = ANY(${v})`;
function resolveInputCodec12(c) {
  if (forceTextTypesSensitive4.includes(resolveDomains4(c))) return listOfCodec(TYPES.text, {
    extensions: {
      listItemNonNull: !0
    }
  });else return listOfCodec(c, {
    extensions: {
      listItemNonNull: !0
    }
  });
}
const resolve40 = (i, v) => sql`${i} <> ALL(${v})`;
const resolve41 = (i, v) => sql`${i} < ${v}`;
const resolve42 = (i, v) => sql`${i} <= ${v}`;
const resolve43 = (i, v) => sql`${i} > ${v}`;
const resolve44 = (i, v) => sql`${i} >= ${v}`;
const resolve45 = (i, v) => sql`${i} LIKE ${v}`;
function escapeLikeWildcards(input) {
  if (typeof input !== "string") throw Error("Non-string input was provided to escapeLikeWildcards");else return input.split("%").join("\\%").split("_").join("\\_");
}
const resolveInput = input => `%${escapeLikeWildcards(input)}%`;
const resolve46 = (i, v) => sql`${i} NOT LIKE ${v}`;
const resolveInput2 = input => `%${escapeLikeWildcards(input)}%`;
const resolve47 = (i, v) => sql`${i} ILIKE ${v}`;
const resolveInput3 = input => `%${escapeLikeWildcards(input)}%`;
const forceTextTypesInsensitive = [TYPES.char, TYPES.bpchar];
function resolveInputCodec13(c) {
  if (c.arrayOfCodec) {
    if (forceTextTypesInsensitive.includes(resolveDomains4(c.arrayOfCodec))) return listOfCodec(TYPES.text, {
      extensions: {
        listItemNonNull: c.extensions?.listItemNonNull
      }
    });
    return c;
  } else {
    if (forceTextTypesInsensitive.includes(resolveDomains4(c))) return TYPES.text;
    return c;
  }
}
function resolveSqlIdentifier5(identifier, c) {
  if (c.arrayOfCodec && forceTextTypesInsensitive.includes(resolveDomains4(c.arrayOfCodec))) return [sql`(${identifier})::text[]`, listOfCodec(TYPES.text, {
    extensions: {
      listItemNonNull: c.extensions?.listItemNonNull
    }
  })];else if (forceTextTypesInsensitive.includes(resolveDomains4(c))) return [sql`(${identifier})::text`, TYPES.text];else return [identifier, c];
}
const resolve48 = (i, v) => sql`${i} NOT ILIKE ${v}`;
const resolveInput4 = input => `%${escapeLikeWildcards(input)}%`;
const resolve49 = (i, v) => sql`${i} LIKE ${v}`;
const resolveInput5 = input => `${escapeLikeWildcards(input)}%`;
const resolve50 = (i, v) => sql`${i} NOT LIKE ${v}`;
const resolveInput6 = input => `${escapeLikeWildcards(input)}%`;
const resolve51 = (i, v) => sql`${i} ILIKE ${v}`;
const resolveInput7 = input => `${escapeLikeWildcards(input)}%`;
const resolve52 = (i, v) => sql`${i} NOT ILIKE ${v}`;
const resolveInput8 = input => `${escapeLikeWildcards(input)}%`;
const resolve53 = (i, v) => sql`${i} LIKE ${v}`;
const resolveInput9 = input => `%${escapeLikeWildcards(input)}`;
const resolve54 = (i, v) => sql`${i} NOT LIKE ${v}`;
const resolveInput10 = input => `%${escapeLikeWildcards(input)}`;
const resolve55 = (i, v) => sql`${i} ILIKE ${v}`;
const resolveInput11 = input => `%${escapeLikeWildcards(input)}`;
const resolve56 = (i, v) => sql`${i} NOT ILIKE ${v}`;
const resolveInput12 = input => `%${escapeLikeWildcards(input)}`;
const resolve57 = (i, v) => sql`${i} LIKE ${v}`;
const resolve58 = (i, v) => sql`${i} NOT LIKE ${v}`;
const resolve59 = (i, v) => sql`${i} ILIKE ${v}`;
const resolve60 = (i, v) => sql`${i} NOT ILIKE ${v}`;
function resolveInputCodec14(inputCodec) {
  if ("equalTo" === "in" || "equalTo" === "notIn") {
    const t = resolveDomains4(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
    return listOfCodec(t, {
      extensions: {
        listItemNonNull: !0
      }
    });
  } else return resolveDomains4(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
}
function resolveSqlIdentifier6(sourceAlias, codec) {
  return resolveDomains4(codec) === TYPES.citext ? [sourceAlias, codec] : [sql`lower(${sourceAlias}::text)`, TYPES.text];
}
function resolveSqlValue5(_unused, input, inputCodec) {
  if ("equalTo" === "in" || "equalTo" === "notIn") {
    const sqlList = sqlValueWithCodec(input, inputCodec);
    if (inputCodec.arrayOfCodec === TYPES.citext) return sqlList;else return sql`(select lower(t) from unnest(${sqlList}) t)`;
  } else {
    const sqlValue = sqlValueWithCodec(input, inputCodec);
    if (inputCodec === TYPES.citext) return sqlValue;else return sql`lower(${sqlValue})`;
  }
}
function resolveInputCodec15(inputCodec) {
  if ("notEqualTo" === "in" || "notEqualTo" === "notIn") {
    const t = resolveDomains4(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
    return listOfCodec(t, {
      extensions: {
        listItemNonNull: !0
      }
    });
  } else return resolveDomains4(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
}
function resolveSqlIdentifier7(sourceAlias, codec) {
  return resolveDomains4(codec) === TYPES.citext ? [sourceAlias, codec] : [sql`lower(${sourceAlias}::text)`, TYPES.text];
}
function resolveSqlValue6(_unused, input, inputCodec) {
  if ("notEqualTo" === "in" || "notEqualTo" === "notIn") {
    const sqlList = sqlValueWithCodec(input, inputCodec);
    if (inputCodec.arrayOfCodec === TYPES.citext) return sqlList;else return sql`(select lower(t) from unnest(${sqlList}) t)`;
  } else {
    const sqlValue = sqlValueWithCodec(input, inputCodec);
    if (inputCodec === TYPES.citext) return sqlValue;else return sql`lower(${sqlValue})`;
  }
}
function resolveInputCodec16(inputCodec) {
  if ("distinctFrom" === "in" || "distinctFrom" === "notIn") {
    const t = resolveDomains4(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
    return listOfCodec(t, {
      extensions: {
        listItemNonNull: !0
      }
    });
  } else return resolveDomains4(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
}
function resolveSqlIdentifier8(sourceAlias, codec) {
  return resolveDomains4(codec) === TYPES.citext ? [sourceAlias, codec] : [sql`lower(${sourceAlias}::text)`, TYPES.text];
}
function resolveSqlValue7(_unused, input, inputCodec) {
  if ("distinctFrom" === "in" || "distinctFrom" === "notIn") {
    const sqlList = sqlValueWithCodec(input, inputCodec);
    if (inputCodec.arrayOfCodec === TYPES.citext) return sqlList;else return sql`(select lower(t) from unnest(${sqlList}) t)`;
  } else {
    const sqlValue = sqlValueWithCodec(input, inputCodec);
    if (inputCodec === TYPES.citext) return sqlValue;else return sql`lower(${sqlValue})`;
  }
}
function resolveInputCodec17(inputCodec) {
  if ("notDistinctFrom" === "in" || "notDistinctFrom" === "notIn") {
    const t = resolveDomains4(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
    return listOfCodec(t, {
      extensions: {
        listItemNonNull: !0
      }
    });
  } else return resolveDomains4(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
}
function resolveSqlIdentifier9(sourceAlias, codec) {
  return resolveDomains4(codec) === TYPES.citext ? [sourceAlias, codec] : [sql`lower(${sourceAlias}::text)`, TYPES.text];
}
function resolveSqlValue8(_unused, input, inputCodec) {
  if ("notDistinctFrom" === "in" || "notDistinctFrom" === "notIn") {
    const sqlList = sqlValueWithCodec(input, inputCodec);
    if (inputCodec.arrayOfCodec === TYPES.citext) return sqlList;else return sql`(select lower(t) from unnest(${sqlList}) t)`;
  } else {
    const sqlValue = sqlValueWithCodec(input, inputCodec);
    if (inputCodec === TYPES.citext) return sqlValue;else return sql`lower(${sqlValue})`;
  }
}
function resolveInputCodec18(inputCodec) {
  if ("in" === "in" || "in" === "notIn") {
    const t = resolveDomains4(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
    return listOfCodec(t, {
      extensions: {
        listItemNonNull: !0
      }
    });
  } else return resolveDomains4(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
}
function resolveSqlIdentifier10(sourceAlias, codec) {
  return resolveDomains4(codec) === TYPES.citext ? [sourceAlias, codec] : [sql`lower(${sourceAlias}::text)`, TYPES.text];
}
function resolveSqlValue9(_unused, input, inputCodec) {
  if ("in" === "in" || "in" === "notIn") {
    const sqlList = sqlValueWithCodec(input, inputCodec);
    if (inputCodec.arrayOfCodec === TYPES.citext) return sqlList;else return sql`(select lower(t) from unnest(${sqlList}) t)`;
  } else {
    const sqlValue = sqlValueWithCodec(input, inputCodec);
    if (inputCodec === TYPES.citext) return sqlValue;else return sql`lower(${sqlValue})`;
  }
}
function resolveInputCodec19(inputCodec) {
  if ("notIn" === "in" || "notIn" === "notIn") {
    const t = resolveDomains4(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
    return listOfCodec(t, {
      extensions: {
        listItemNonNull: !0
      }
    });
  } else return resolveDomains4(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
}
function resolveSqlIdentifier11(sourceAlias, codec) {
  return resolveDomains4(codec) === TYPES.citext ? [sourceAlias, codec] : [sql`lower(${sourceAlias}::text)`, TYPES.text];
}
function resolveSqlValue10(_unused, input, inputCodec) {
  if ("notIn" === "in" || "notIn" === "notIn") {
    const sqlList = sqlValueWithCodec(input, inputCodec);
    if (inputCodec.arrayOfCodec === TYPES.citext) return sqlList;else return sql`(select lower(t) from unnest(${sqlList}) t)`;
  } else {
    const sqlValue = sqlValueWithCodec(input, inputCodec);
    if (inputCodec === TYPES.citext) return sqlValue;else return sql`lower(${sqlValue})`;
  }
}
function resolveInputCodec20(inputCodec) {
  if ("lessThan" === "in" || "lessThan" === "notIn") {
    const t = resolveDomains4(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
    return listOfCodec(t, {
      extensions: {
        listItemNonNull: !0
      }
    });
  } else return resolveDomains4(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
}
function resolveSqlIdentifier12(sourceAlias, codec) {
  return resolveDomains4(codec) === TYPES.citext ? [sourceAlias, codec] : [sql`lower(${sourceAlias}::text)`, TYPES.text];
}
function resolveSqlValue11(_unused, input, inputCodec) {
  if ("lessThan" === "in" || "lessThan" === "notIn") {
    const sqlList = sqlValueWithCodec(input, inputCodec);
    if (inputCodec.arrayOfCodec === TYPES.citext) return sqlList;else return sql`(select lower(t) from unnest(${sqlList}) t)`;
  } else {
    const sqlValue = sqlValueWithCodec(input, inputCodec);
    if (inputCodec === TYPES.citext) return sqlValue;else return sql`lower(${sqlValue})`;
  }
}
function resolveInputCodec21(inputCodec) {
  if ("lessThanOrEqualTo" === "in" || "lessThanOrEqualTo" === "notIn") {
    const t = resolveDomains4(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
    return listOfCodec(t, {
      extensions: {
        listItemNonNull: !0
      }
    });
  } else return resolveDomains4(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
}
function resolveSqlIdentifier13(sourceAlias, codec) {
  return resolveDomains4(codec) === TYPES.citext ? [sourceAlias, codec] : [sql`lower(${sourceAlias}::text)`, TYPES.text];
}
function resolveSqlValue12(_unused, input, inputCodec) {
  if ("lessThanOrEqualTo" === "in" || "lessThanOrEqualTo" === "notIn") {
    const sqlList = sqlValueWithCodec(input, inputCodec);
    if (inputCodec.arrayOfCodec === TYPES.citext) return sqlList;else return sql`(select lower(t) from unnest(${sqlList}) t)`;
  } else {
    const sqlValue = sqlValueWithCodec(input, inputCodec);
    if (inputCodec === TYPES.citext) return sqlValue;else return sql`lower(${sqlValue})`;
  }
}
function resolveInputCodec22(inputCodec) {
  if ("greaterThan" === "in" || "greaterThan" === "notIn") {
    const t = resolveDomains4(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
    return listOfCodec(t, {
      extensions: {
        listItemNonNull: !0
      }
    });
  } else return resolveDomains4(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
}
function resolveSqlIdentifier14(sourceAlias, codec) {
  return resolveDomains4(codec) === TYPES.citext ? [sourceAlias, codec] : [sql`lower(${sourceAlias}::text)`, TYPES.text];
}
function resolveSqlValue13(_unused, input, inputCodec) {
  if ("greaterThan" === "in" || "greaterThan" === "notIn") {
    const sqlList = sqlValueWithCodec(input, inputCodec);
    if (inputCodec.arrayOfCodec === TYPES.citext) return sqlList;else return sql`(select lower(t) from unnest(${sqlList}) t)`;
  } else {
    const sqlValue = sqlValueWithCodec(input, inputCodec);
    if (inputCodec === TYPES.citext) return sqlValue;else return sql`lower(${sqlValue})`;
  }
}
function resolveInputCodec23(inputCodec) {
  if ("greaterThanOrEqualTo" === "in" || "greaterThanOrEqualTo" === "notIn") {
    const t = resolveDomains4(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
    return listOfCodec(t, {
      extensions: {
        listItemNonNull: !0
      }
    });
  } else return resolveDomains4(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
}
function resolveSqlIdentifier15(sourceAlias, codec) {
  return resolveDomains4(codec) === TYPES.citext ? [sourceAlias, codec] : [sql`lower(${sourceAlias}::text)`, TYPES.text];
}
function resolveSqlValue14(_unused, input, inputCodec) {
  if ("greaterThanOrEqualTo" === "in" || "greaterThanOrEqualTo" === "notIn") {
    const sqlList = sqlValueWithCodec(input, inputCodec);
    if (inputCodec.arrayOfCodec === TYPES.citext) return sqlList;else return sql`(select lower(t) from unnest(${sqlList}) t)`;
  } else {
    const sqlValue = sqlValueWithCodec(input, inputCodec);
    if (inputCodec === TYPES.citext) return sqlValue;else return sql`lower(${sqlValue})`;
  }
}
const resolve61 = (i, _v, input) => sql`${i} ${input ? sql`IS NULL` : sql`IS NOT NULL`}`;
const resolveInputCodec24 = () => TYPES.boolean;
const resolveSqlValue15 = () => sql.null;
const resolve62 = (i, v) => sql`${i} = ${v}`;
const forceTextTypesSensitive5 = [TYPES.citext, TYPES.char, TYPES.bpchar];
function resolveDomains5(c) {
  let current = c;
  while (current.domainOfCodec) current = current.domainOfCodec;
  return current;
}
function resolveInputCodec25(c) {
  if (c.arrayOfCodec) {
    if (forceTextTypesSensitive5.includes(resolveDomains5(c.arrayOfCodec))) return listOfCodec(TYPES.text, {
      extensions: {
        listItemNonNull: c.extensions?.listItemNonNull
      }
    });
    return c;
  } else {
    if (forceTextTypesSensitive5.includes(resolveDomains5(c))) return TYPES.text;
    return c;
  }
}
function resolveSqlIdentifier16(identifier, c) {
  if (c.arrayOfCodec && forceTextTypesSensitive5.includes(resolveDomains5(c.arrayOfCodec))) return [sql`(${identifier})::text[]`, listOfCodec(TYPES.text, {
    extensions: {
      listItemNonNull: c.extensions?.listItemNonNull
    }
  })];else if (forceTextTypesSensitive5.includes(resolveDomains5(c))) return [sql`(${identifier})::text`, TYPES.text];else return [identifier, c];
}
const resolve63 = (i, v) => sql`${i} <> ${v}`;
const resolve64 = (i, v) => sql`${i} IS DISTINCT FROM ${v}`;
const resolve65 = (i, v) => sql`${i} IS NOT DISTINCT FROM ${v}`;
const resolve66 = (i, v) => sql`${i} = ANY(${v})`;
function resolveInputCodec26(c) {
  if (forceTextTypesSensitive5.includes(resolveDomains5(c))) return listOfCodec(TYPES.text, {
    extensions: {
      listItemNonNull: !0
    }
  });else return listOfCodec(c, {
    extensions: {
      listItemNonNull: !0
    }
  });
}
const resolve67 = (i, v) => sql`${i} <> ALL(${v})`;
const resolve68 = (i, v) => sql`${i} < ${v}`;
const resolve69 = (i, v) => sql`${i} <= ${v}`;
const resolve70 = (i, v) => sql`${i} > ${v}`;
const resolve71 = (i, v) => sql`${i} >= ${v}`;
function assertAllowed12(value, mode) {
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
const PgAggregateConditionExpression = class PgAggregateConditionExpression extends Modifier {
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
};
const PgAggregateCondition = class PgAggregateCondition extends Modifier {
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
};
const resolve72 = (i, _v, input) => sql`${i} ${input ? sql`IS NULL` : sql`IS NOT NULL`}`;
const resolveInputCodec27 = () => TYPES.boolean;
const resolveSqlValue16 = () => sql.null;
const resolve73 = (i, v) => sql`${i} = ${v}`;
const forceTextTypesSensitive6 = [TYPES.citext, TYPES.char, TYPES.bpchar];
function resolveDomains6(c) {
  let current = c;
  while (current.domainOfCodec) current = current.domainOfCodec;
  return current;
}
function resolveInputCodec28(c) {
  if (c.arrayOfCodec) {
    if (forceTextTypesSensitive6.includes(resolveDomains6(c.arrayOfCodec))) return listOfCodec(TYPES.text, {
      extensions: {
        listItemNonNull: c.extensions?.listItemNonNull
      }
    });
    return c;
  } else {
    if (forceTextTypesSensitive6.includes(resolveDomains6(c))) return TYPES.text;
    return c;
  }
}
function resolveSqlIdentifier17(identifier, c) {
  if (c.arrayOfCodec && forceTextTypesSensitive6.includes(resolveDomains6(c.arrayOfCodec))) return [sql`(${identifier})::text[]`, listOfCodec(TYPES.text, {
    extensions: {
      listItemNonNull: c.extensions?.listItemNonNull
    }
  })];else if (forceTextTypesSensitive6.includes(resolveDomains6(c))) return [sql`(${identifier})::text`, TYPES.text];else return [identifier, c];
}
const resolve74 = (i, v) => sql`${i} <> ${v}`;
const resolve75 = (i, v) => sql`${i} IS DISTINCT FROM ${v}`;
const resolve76 = (i, v) => sql`${i} IS NOT DISTINCT FROM ${v}`;
const resolve77 = (i, v) => sql`${i} = ANY(${v})`;
function resolveInputCodec29(c) {
  if (forceTextTypesSensitive6.includes(resolveDomains6(c))) return listOfCodec(TYPES.text, {
    extensions: {
      listItemNonNull: !0
    }
  });else return listOfCodec(c, {
    extensions: {
      listItemNonNull: !0
    }
  });
}
const resolve78 = (i, v) => sql`${i} <> ALL(${v})`;
const resolve79 = (i, v) => sql`${i} < ${v}`;
const resolve80 = (i, v) => sql`${i} <= ${v}`;
const resolve81 = (i, v) => sql`${i} > ${v}`;
const resolve82 = (i, v) => sql`${i} >= ${v}`;
function assertAllowed13(value, mode) {
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
const colSpec16 = {
  fieldName: "rowId",
  attributeName: "id",
  attribute: spec_repository.attributes.id
};
const colSpec17 = {
  fieldName: "ownerId",
  attributeName: "owner_id",
  attribute: spec_repository.attributes.owner_id
};
const colSpec18 = {
  fieldName: "organizationId",
  attributeName: "organization_id",
  attribute: spec_repository.attributes.organization_id
};
const colSpec19 = {
  fieldName: "name",
  attributeName: "name",
  attribute: spec_repository.attributes.name
};
const colSpec20 = {
  fieldName: "slug",
  attributeName: "slug",
  attribute: spec_repository.attributes.slug
};
const colSpec21 = {
  fieldName: "description",
  attributeName: "description",
  attribute: spec_repository.attributes.description
};
const colSpec22 = {
  fieldName: "visibility",
  attributeName: "visibility",
  attribute: spec_repository.attributes.visibility
};
const colSpec23 = {
  fieldName: "defaultBranch",
  attributeName: "default_branch",
  attribute: spec_repository.attributes.default_branch
};
const colSpec24 = {
  fieldName: "createdAt",
  attributeName: "created_at",
  attribute: spec_repository.attributes.created_at
};
const colSpec25 = {
  fieldName: "updatedAt",
  attributeName: "updated_at",
  attribute: spec_repository.attributes.updated_at
};
function assertAllowed14(value, mode) {
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
function assertAllowed15(value, mode) {
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
function assertAllowed16(value, mode) {
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
const resolve83 = (i, _v, input) => sql`${i} ${input ? sql`IS NULL` : sql`IS NOT NULL`}`;
const resolveInputCodec30 = () => TYPES.boolean;
const resolveSqlValue17 = () => sql.null;
const resolve84 = (i, v) => sql`${i} = ${v}`;
const forceTextTypesSensitive7 = [TYPES.citext, TYPES.char, TYPES.bpchar];
function resolveDomains7(c) {
  let current = c;
  while (current.domainOfCodec) current = current.domainOfCodec;
  return current;
}
function resolveInputCodec31(c) {
  if (c.arrayOfCodec) {
    if (forceTextTypesSensitive7.includes(resolveDomains7(c.arrayOfCodec))) return listOfCodec(TYPES.text, {
      extensions: {
        listItemNonNull: c.extensions?.listItemNonNull
      }
    });
    return c;
  } else {
    if (forceTextTypesSensitive7.includes(resolveDomains7(c))) return TYPES.text;
    return c;
  }
}
function resolveSqlIdentifier18(identifier, c) {
  if (c.arrayOfCodec && forceTextTypesSensitive7.includes(resolveDomains7(c.arrayOfCodec))) return [sql`(${identifier})::text[]`, listOfCodec(TYPES.text, {
    extensions: {
      listItemNonNull: c.extensions?.listItemNonNull
    }
  })];else if (forceTextTypesSensitive7.includes(resolveDomains7(c))) return [sql`(${identifier})::text`, TYPES.text];else return [identifier, c];
}
const resolve85 = (i, v) => sql`${i} <> ${v}`;
const resolve86 = (i, v) => sql`${i} IS DISTINCT FROM ${v}`;
const resolve87 = (i, v) => sql`${i} IS NOT DISTINCT FROM ${v}`;
const resolve88 = (i, v) => sql`${i} = ANY(${v})`;
function resolveInputCodec32(c) {
  if (forceTextTypesSensitive7.includes(resolveDomains7(c))) return listOfCodec(TYPES.text, {
    extensions: {
      listItemNonNull: !0
    }
  });else return listOfCodec(c, {
    extensions: {
      listItemNonNull: !0
    }
  });
}
const resolve89 = (i, v) => sql`${i} <> ALL(${v})`;
const resolve90 = (i, v) => sql`${i} < ${v}`;
const resolve91 = (i, v) => sql`${i} <= ${v}`;
const resolve92 = (i, v) => sql`${i} > ${v}`;
const resolve93 = (i, v) => sql`${i} >= ${v}`;
function assertAllowed17(value, mode) {
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
const colSpec26 = {
  fieldName: "repositoryId",
  attributeName: "repository_id",
  attribute: spec_repositoryCollaborator.attributes.repository_id
};
const colSpec27 = {
  fieldName: "userId",
  attributeName: "user_id",
  attribute: spec_repositoryCollaborator.attributes.user_id
};
const colSpec28 = {
  fieldName: "permission",
  attributeName: "permission",
  attribute: spec_repositoryCollaborator.attributes.permission
};
const colSpec29 = {
  fieldName: "createdAt",
  attributeName: "created_at",
  attribute: spec_repositoryCollaborator.attributes.created_at
};
const colSpec30 = {
  fieldName: "updatedAt",
  attributeName: "updated_at",
  attribute: spec_repositoryCollaborator.attributes.updated_at
};
function assertAllowed18(value, mode) {
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
function assertAllowed19(value, mode) {
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
const resolve94 = (i, _v, input) => sql`${i} ${input ? sql`IS NULL` : sql`IS NOT NULL`}`;
const resolveInputCodec33 = () => TYPES.boolean;
const resolveSqlValue18 = () => sql.null;
const resolve95 = (i, v) => sql`${i} = ${v}`;
const forceTextTypesSensitive8 = [TYPES.citext, TYPES.char, TYPES.bpchar];
function resolveDomains8(c) {
  let current = c;
  while (current.domainOfCodec) current = current.domainOfCodec;
  return current;
}
function resolveInputCodec34(c) {
  if (c.arrayOfCodec) {
    if (forceTextTypesSensitive8.includes(resolveDomains8(c.arrayOfCodec))) return listOfCodec(TYPES.text, {
      extensions: {
        listItemNonNull: c.extensions?.listItemNonNull
      }
    });
    return c;
  } else {
    if (forceTextTypesSensitive8.includes(resolveDomains8(c))) return TYPES.text;
    return c;
  }
}
function resolveSqlIdentifier19(identifier, c) {
  if (c.arrayOfCodec && forceTextTypesSensitive8.includes(resolveDomains8(c.arrayOfCodec))) return [sql`(${identifier})::text[]`, listOfCodec(TYPES.text, {
    extensions: {
      listItemNonNull: c.extensions?.listItemNonNull
    }
  })];else if (forceTextTypesSensitive8.includes(resolveDomains8(c))) return [sql`(${identifier})::text`, TYPES.text];else return [identifier, c];
}
const resolve96 = (i, v) => sql`${i} <> ${v}`;
const resolve97 = (i, v) => sql`${i} IS DISTINCT FROM ${v}`;
const resolve98 = (i, v) => sql`${i} IS NOT DISTINCT FROM ${v}`;
const resolve99 = (i, v) => sql`${i} = ANY(${v})`;
function resolveInputCodec35(c) {
  if (forceTextTypesSensitive8.includes(resolveDomains8(c))) return listOfCodec(TYPES.text, {
    extensions: {
      listItemNonNull: !0
    }
  });else return listOfCodec(c, {
    extensions: {
      listItemNonNull: !0
    }
  });
}
const resolve100 = (i, v) => sql`${i} <> ALL(${v})`;
const resolve101 = (i, v) => sql`${i} < ${v}`;
const resolve102 = (i, v) => sql`${i} <= ${v}`;
const resolve103 = (i, v) => sql`${i} > ${v}`;
const resolve104 = (i, v) => sql`${i} >= ${v}`;
const colSpec31 = {
  fieldName: "rowId",
  attributeName: "id",
  attribute: spec_user.attributes.id
};
const colSpec32 = {
  fieldName: "identityProviderId",
  attributeName: "identity_provider_id",
  attribute: spec_user.attributes.identity_provider_id
};
const colSpec33 = {
  fieldName: "name",
  attributeName: "name",
  attribute: spec_user.attributes.name
};
const colSpec34 = {
  fieldName: "avatarUrl",
  attributeName: "avatar_url",
  attribute: spec_user.attributes.avatar_url
};
const colSpec35 = {
  fieldName: "email",
  attributeName: "email",
  attribute: spec_user.attributes.email
};
const colSpec36 = {
  fieldName: "createdAt",
  attributeName: "created_at",
  attribute: spec_user.attributes.created_at
};
const colSpec37 = {
  fieldName: "updatedAt",
  attributeName: "updated_at",
  attribute: spec_user.attributes.updated_at
};
const colSpec38 = {
  fieldName: "username",
  attributeName: "username",
  attribute: spec_user.attributes.username
};
const colSpec39 = {
  fieldName: "bio",
  attributeName: "bio",
  attribute: spec_user.attributes.bio
};
function assertAllowed20(value, mode) {
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
function assertAllowed21(value, mode) {
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
function assertAllowed22(value, mode) {
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
function assertAllowed23(value, mode) {
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
function assertAllowed24(value, mode) {
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
function assertAllowed25(value, mode) {
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
function assertAllowed26(value, mode) {
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
function assertAllowed27(value, mode) {
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
function assertAllowed28(value, mode) {
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
const relation = registry.pgRelations["repository"]["repositoryCollaboratorsByTheirRepositoryId"];
const relation2 = registry.pgRelations["user"]["organizationMembersByTheirUserId"];
const relation3 = registry.pgRelations["user"]["repositoriesByTheirOwnerId"];
const relation4 = registry.pgRelations["user"]["repositoryCollaboratorsByTheirUserId"];
const relation5 = registry.pgRelations["organization"]["organizationMembersByTheirOrganizationId"];
const relation6 = registry.pgRelations["organization"]["repositoriesByTheirOrganizationId"];
function oldPlan(_, args) {
  const $insert = pgInsertSingle(resource_organization_memberPgResource, Object.create(null));
  args.apply($insert);
  return object({
    result: $insert
  });
}
const billingBypassSlugs = [];
const planWrapper = (plan, _, fieldArgs) => {
  const $input = fieldArgs.getRaw(["input", "organizationMember"]),
    $observer = context().get("observer"),
    $db = context().get("db");
  sideEffect([$input, $observer, $db], async ([input, observer, db]) => {
    if (!observer) throw Error("Unauthorized");
    if ("create" === "create") {
      const {
          organizationId,
          userId: newMemberUserId,
          role: newMemberRole
        } = input,
        organization = await db.query.organizationTable.findFirst({
          where(table, {
            eq
          }) {
            return eq(table.id, organizationId);
          },
          with: {
            organizationMembers: !0
          }
        });
      if (!organization) throw Error("Unauthorized");
      if (!(organization.organizationMembers.length === 0 && newMemberUserId === observer.id && newMemberRole === "owner")) {
        const callerMembership = organization.organizationMembers.find(om => om.userId === observer.id);
        if (!callerMembership) throw Error("Unauthorized");
        if (callerMembership.role === "member") throw Error("Unauthorized");
      }
      if (!billingBypassSlugs.includes(organization.slug)) {
        if (organization.tier === "free") {
          if (organization.organizationMembers.length >= 3) throw Error("Maximum number of members reached");
          const numberOfAdmins = organization.organizationMembers.filter(member => member.role !== "member").length;
          if (newMemberRole && newMemberRole !== "member") {
            if (numberOfAdmins >= 1) throw Error("Maximum number of admins reached");
          }
        }
        if (organization.tier === "basic") {
          if (organization.organizationMembers.length >= 10) throw Error("Maximum number of members reached");
          const numberOfAdmins = organization.organizationMembers.filter(member => member.role !== "member").length;
          if (newMemberRole && newMemberRole !== "member") {
            if (numberOfAdmins >= 3) throw Error("Maximum number of admins reached");
          }
        }
      }
    } else {
      const {
          organizationId: targetOrganizationId,
          userId: targetUserId
        } = input,
        organization = await db.query.organizationTable.findFirst({
          where(table, {
            eq
          }) {
            return eq(table.id, targetOrganizationId);
          },
          with: {
            organizationMembers: !0
          }
        });
      if (!organization) throw Error("Unauthorized");
      const callerMembership = organization.organizationMembers.find(om => om.userId === observer.id);
      if (!callerMembership) throw Error("Unauthorized");
      if (callerMembership.role === "member") throw Error("Unauthorized");
      const targetMember = organization.organizationMembers.find(om => om.userId === targetUserId);
      if (!targetMember) throw Error("Not found");
      if (targetMember.role === "owner") throw Error("Cannot modify owner");
      const newRole = input.role;
      if (newRole && newRole !== "member" && !billingBypassSlugs.includes(organization.slug)) {
        const numberOfAdmins = organization.organizationMembers.filter(member => member.role !== "member").length,
          effectiveAdminCount = targetMember.role !== "member" ? numberOfAdmins : numberOfAdmins + 1;
        if (organization.tier === "free" && effectiveAdminCount > 1) throw Error("Maximum number of admins reached");
        if (organization.tier === "basic" && effectiveAdminCount > 3) throw Error("Maximum number of admins reached");
      }
      if (newRole === "owner") throw Error("Cannot promote to owner");
    }
  });
  return plan();
};
function oldPlan2(_, args) {
  const $insert = pgInsertSingle(resource_repository_collaboratorPgResource, Object.create(null));
  args.apply($insert);
  return object({
    result: $insert
  });
}
const planWrapper2 = (plan, _, fieldArgs) => {
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
          collaborators: !0,
          organization: !0
        }
      });
    if (!repository) throw Error("Unauthorized");
    const isOwner = repository.ownerId === observer.id,
      isAdminCollaborator = repository.collaborators.find(rc => rc.userId === observer.id)?.permission === "admin";
    if (!isOwner && !isAdminCollaborator) throw Error("Unauthorized");
    if ("create" === "create") {
      if (repository.organization) {
        const org = repository.organization;
        if (!billingBypassSlugs.includes(org.slug)) {
          if (org.tier === "free") {
            if (repository.collaborators.length >= 3) throw Error("Maximum number of collaborators reached");
          }
          if (org.tier === "basic") {
            if (repository.collaborators.length >= 10) throw Error("Maximum number of collaborators reached");
          }
        }
      }
    }
    if ("create" === "update") {
      if (input.userId === repository.ownerId) throw Error("Cannot modify owner permissions");
    }
  });
  return plan();
};
function oldPlan3(_, args) {
  const $insert = pgInsertSingle(resource_userPgResource, Object.create(null));
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
    if ("create" === "create") throw Error("Unauthorized");
    if ("create" === "update" || "create" === "delete") {
      if (input !== observer.id) throw Error("Unauthorized");
    }
  });
  return plan();
};
function oldPlan4(_, args) {
  const $insert = pgInsertSingle(resource_repositoryPgResource, Object.create(null));
  args.apply($insert);
  return object({
    result: $insert
  });
}
const planWrapper4 = (plan, _, fieldArgs) => {
  const $input = fieldArgs.getRaw(["input", "repository"]),
    $observer = context().get("observer"),
    $db = context().get("db");
  sideEffect([$input, $observer, $db], async ([input, observer, db]) => {
    if (!observer) throw Error("Unauthorized");
    if ("create" === "create") {
      const organizationId = input.organizationId;
      if (!organizationId) return;
      const organization = await db.query.organizationTable.findFirst({
        where(table, {
          eq
        }) {
          return eq(table.id, organizationId);
        },
        with: {
          organizationMembers: {
            where(table, {
              eq
            }) {
              return eq(table.userId, observer.id);
            }
          },
          repositories: !0
        }
      });
      if (!organization) throw Error("Unauthorized");
      if (!organization.organizationMembers.length) throw Error("Unauthorized");
      if (!billingBypassSlugs.includes(organization.slug)) {
        if (organization.tier === "free") {
          if (organization.repositories.length >= 5) throw Error("Maximum number of repositories reached");
        }
        if (organization.tier === "basic") {
          if (organization.repositories.length >= 25) throw Error("Maximum number of repositories reached");
        }
      }
    } else {
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
      if ("create" === "delete") {
        if (!isOwner) throw Error("Unauthorized");
      } else if ("create" === "update") {
        if (!isOwner && !isAdminCollaborator) throw Error("Unauthorized");
      }
    }
  });
  return plan();
};
function oldPlan5(_, args) {
  const $insert = pgInsertSingle(resource_organizationPgResource, Object.create(null));
  args.apply($insert);
  return object({
    result: $insert
  });
}
const planWrapper5 = (plan, _, fieldArgs) => {
  const $input = fieldArgs.getRaw(["input", "organization"]),
    $observer = context().get("observer"),
    $db = context().get("db");
  sideEffect([$input, $observer, $db], async ([input, observer, db]) => {
    if (!observer) throw Error("Unauthorized");
    if ("create" !== "create") {
      const organization = await db.query.organizationTable.findFirst({
        where(table, {
          eq
        }) {
          return eq(table.id, input);
        },
        with: {
          organizationMembers: {
            where(table, {
              eq
            }) {
              return eq(table.userId, observer.id);
            }
          }
        }
      });
      if (!organization || !organization.organizationMembers.length) throw Error("Unauthorized");
      const role = organization.organizationMembers[0].role;
      if ("create" === "delete") {
        if (role !== "owner") throw Error("Unauthorized");
      } else if ("create" === "update") {
        if (role === "member") throw Error("Unauthorized");
      }
    }
  });
  return plan();
};
const specFromArgs_OrganizationMember = args => {
  const $nodeId = args.getRaw(["input", "id"]);
  return specFromNodeId(nodeIdHandler_OrganizationMember, $nodeId);
};
const oldPlan6 = (_$root, args) => {
  const $update = pgUpdateSingle(resource_organization_memberPgResource, {
    organization_id: args.getRaw(['input', "organizationId"]),
    user_id: args.getRaw(['input', "userId"])
  });
  args.apply($update);
  return object({
    result: $update
  });
};
const planWrapper6 = (plan, _, fieldArgs) => {
  const $input = fieldArgs.getRaw(["input", "patch"]),
    $observer = context().get("observer"),
    $db = context().get("db");
  sideEffect([$input, $observer, $db], async ([input, observer, db]) => {
    if (!observer) throw Error("Unauthorized");
    if ("update" === "create") {
      const {
          organizationId,
          userId: newMemberUserId,
          role: newMemberRole
        } = input,
        organization = await db.query.organizationTable.findFirst({
          where(table, {
            eq
          }) {
            return eq(table.id, organizationId);
          },
          with: {
            organizationMembers: !0
          }
        });
      if (!organization) throw Error("Unauthorized");
      if (!(organization.organizationMembers.length === 0 && newMemberUserId === observer.id && newMemberRole === "owner")) {
        const callerMembership = organization.organizationMembers.find(om => om.userId === observer.id);
        if (!callerMembership) throw Error("Unauthorized");
        if (callerMembership.role === "member") throw Error("Unauthorized");
      }
      if (!billingBypassSlugs.includes(organization.slug)) {
        if (organization.tier === "free") {
          if (organization.organizationMembers.length >= 3) throw Error("Maximum number of members reached");
          const numberOfAdmins = organization.organizationMembers.filter(member => member.role !== "member").length;
          if (newMemberRole && newMemberRole !== "member") {
            if (numberOfAdmins >= 1) throw Error("Maximum number of admins reached");
          }
        }
        if (organization.tier === "basic") {
          if (organization.organizationMembers.length >= 10) throw Error("Maximum number of members reached");
          const numberOfAdmins = organization.organizationMembers.filter(member => member.role !== "member").length;
          if (newMemberRole && newMemberRole !== "member") {
            if (numberOfAdmins >= 3) throw Error("Maximum number of admins reached");
          }
        }
      }
    } else {
      const {
          organizationId: targetOrganizationId,
          userId: targetUserId
        } = input,
        organization = await db.query.organizationTable.findFirst({
          where(table, {
            eq
          }) {
            return eq(table.id, targetOrganizationId);
          },
          with: {
            organizationMembers: !0
          }
        });
      if (!organization) throw Error("Unauthorized");
      const callerMembership = organization.organizationMembers.find(om => om.userId === observer.id);
      if (!callerMembership) throw Error("Unauthorized");
      if (callerMembership.role === "member") throw Error("Unauthorized");
      const targetMember = organization.organizationMembers.find(om => om.userId === targetUserId);
      if (!targetMember) throw Error("Not found");
      if (targetMember.role === "owner") throw Error("Cannot modify owner");
      const newRole = input.role;
      if (newRole && newRole !== "member" && !billingBypassSlugs.includes(organization.slug)) {
        const numberOfAdmins = organization.organizationMembers.filter(member => member.role !== "member").length,
          effectiveAdminCount = targetMember.role !== "member" ? numberOfAdmins : numberOfAdmins + 1;
        if (organization.tier === "free" && effectiveAdminCount > 1) throw Error("Maximum number of admins reached");
        if (organization.tier === "basic" && effectiveAdminCount > 3) throw Error("Maximum number of admins reached");
      }
      if (newRole === "owner") throw Error("Cannot promote to owner");
    }
  });
  return plan();
};
const specFromArgs_RepositoryCollaborator = args => {
  const $nodeId = args.getRaw(["input", "id"]);
  return specFromNodeId(nodeIdHandler_RepositoryCollaborator, $nodeId);
};
const oldPlan7 = (_$root, args) => {
  const $update = pgUpdateSingle(resource_repository_collaboratorPgResource, {
    repository_id: args.getRaw(['input', "repositoryId"]),
    user_id: args.getRaw(['input', "userId"])
  });
  args.apply($update);
  return object({
    result: $update
  });
};
const planWrapper7 = (plan, _, fieldArgs) => {
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
          collaborators: !0,
          organization: !0
        }
      });
    if (!repository) throw Error("Unauthorized");
    const isOwner = repository.ownerId === observer.id,
      isAdminCollaborator = repository.collaborators.find(rc => rc.userId === observer.id)?.permission === "admin";
    if (!isOwner && !isAdminCollaborator) throw Error("Unauthorized");
    if ("update" === "create") {
      if (repository.organization) {
        const org = repository.organization;
        if (!billingBypassSlugs.includes(org.slug)) {
          if (org.tier === "free") {
            if (repository.collaborators.length >= 3) throw Error("Maximum number of collaborators reached");
          }
          if (org.tier === "basic") {
            if (repository.collaborators.length >= 10) throw Error("Maximum number of collaborators reached");
          }
        }
      }
    }
    if ("update" === "update") {
      if (input.userId === repository.ownerId) throw Error("Cannot modify owner permissions");
    }
  });
  return plan();
};
const specFromArgs_User = args => {
  const $nodeId = args.getRaw(["input", "id"]);
  return specFromNodeId(nodeIdHandler_User, $nodeId);
};
const oldPlan8 = (_$root, args) => {
  const $update = pgUpdateSingle(resource_userPgResource, {
    id: args.getRaw(['input', "rowId"])
  });
  args.apply($update);
  return object({
    result: $update
  });
};
const planWrapper8 = (plan, _, fieldArgs) => {
  const $input = fieldArgs.getRaw(["input", "rowId"]),
    $observer = context().get("observer");
  sideEffect([$input, $observer], async ([input, observer]) => {
    if (!observer) throw Error("Unauthorized");
    if ("update" === "create") throw Error("Unauthorized");
    if ("update" === "update" || "update" === "delete") {
      if (input !== observer.id) throw Error("Unauthorized");
    }
  });
  return plan();
};
const specFromArgs_Repository = args => {
  const $nodeId = args.getRaw(["input", "id"]);
  return specFromNodeId(nodeIdHandler_Repository, $nodeId);
};
const oldPlan9 = (_$root, args) => {
  const $update = pgUpdateSingle(resource_repositoryPgResource, {
    id: args.getRaw(['input', "rowId"])
  });
  args.apply($update);
  return object({
    result: $update
  });
};
const planWrapper9 = (plan, _, fieldArgs) => {
  const $input = fieldArgs.getRaw(["input", "rowId"]),
    $observer = context().get("observer"),
    $db = context().get("db");
  sideEffect([$input, $observer, $db], async ([input, observer, db]) => {
    if (!observer) throw Error("Unauthorized");
    if ("update" === "create") {
      const organizationId = input.organizationId;
      if (!organizationId) return;
      const organization = await db.query.organizationTable.findFirst({
        where(table, {
          eq
        }) {
          return eq(table.id, organizationId);
        },
        with: {
          organizationMembers: {
            where(table, {
              eq
            }) {
              return eq(table.userId, observer.id);
            }
          },
          repositories: !0
        }
      });
      if (!organization) throw Error("Unauthorized");
      if (!organization.organizationMembers.length) throw Error("Unauthorized");
      if (!billingBypassSlugs.includes(organization.slug)) {
        if (organization.tier === "free") {
          if (organization.repositories.length >= 5) throw Error("Maximum number of repositories reached");
        }
        if (organization.tier === "basic") {
          if (organization.repositories.length >= 25) throw Error("Maximum number of repositories reached");
        }
      }
    } else {
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
      if ("update" === "delete") {
        if (!isOwner) throw Error("Unauthorized");
      } else if ("update" === "update") {
        if (!isOwner && !isAdminCollaborator) throw Error("Unauthorized");
      }
    }
  });
  return plan();
};
const specFromArgs_Organization = args => {
  const $nodeId = args.getRaw(["input", "id"]);
  return specFromNodeId(nodeIdHandler_Organization, $nodeId);
};
const oldPlan10 = (_$root, args) => {
  const $update = pgUpdateSingle(resource_organizationPgResource, {
    id: args.getRaw(['input', "rowId"])
  });
  args.apply($update);
  return object({
    result: $update
  });
};
const planWrapper10 = (plan, _, fieldArgs) => {
  const $input = fieldArgs.getRaw(["input", "rowId"]),
    $observer = context().get("observer"),
    $db = context().get("db");
  sideEffect([$input, $observer, $db], async ([input, observer, db]) => {
    if (!observer) throw Error("Unauthorized");
    if ("update" !== "create") {
      const organization = await db.query.organizationTable.findFirst({
        where(table, {
          eq
        }) {
          return eq(table.id, input);
        },
        with: {
          organizationMembers: {
            where(table, {
              eq
            }) {
              return eq(table.userId, observer.id);
            }
          }
        }
      });
      if (!organization || !organization.organizationMembers.length) throw Error("Unauthorized");
      const role = organization.organizationMembers[0].role;
      if ("update" === "delete") {
        if (role !== "owner") throw Error("Unauthorized");
      } else if ("update" === "update") {
        if (role === "member") throw Error("Unauthorized");
      }
    }
  });
  return plan();
};
const specFromArgs_OrganizationMember2 = args => {
  const $nodeId = args.getRaw(["input", "id"]);
  return specFromNodeId(nodeIdHandler_OrganizationMember, $nodeId);
};
const oldPlan11 = (_$root, args) => {
  const $delete = pgDeleteSingle(resource_organization_memberPgResource, {
    organization_id: args.getRaw(['input', "organizationId"]),
    user_id: args.getRaw(['input', "userId"])
  });
  args.apply($delete);
  return object({
    result: $delete
  });
};
const planWrapper11 = (plan, _, fieldArgs) => {
  const $organizationId = fieldArgs.getRaw(["input", "organizationId"]),
    $userId = fieldArgs.getRaw(["input", "userId"]),
    $observer = context().get("observer"),
    $db = context().get("db");
  sideEffect([$organizationId, $userId, $observer, $db], async ([organizationId, userId, observer, db]) => {
    if (!observer) throw Error("Unauthorized");
    const organization = await db.query.organizationTable.findFirst({
      where(table, {
        eq
      }) {
        return eq(table.id, organizationId);
      },
      with: {
        organizationMembers: !0
      }
    });
    if (!organization) throw Error("Unauthorized");
    const callerMembership = organization.organizationMembers.find(om => om.userId === observer.id);
    if (!callerMembership) throw Error("Unauthorized");
    if (callerMembership.role === "member") throw Error("Unauthorized");
    const targetMember = organization.organizationMembers.find(om => om.userId === userId);
    if (!targetMember) throw Error("Not found");
    if (targetMember.role === "owner") throw Error("Cannot remove owner");
  });
  return plan();
};
const specFromArgs_RepositoryCollaborator2 = args => {
  const $nodeId = args.getRaw(["input", "id"]);
  return specFromNodeId(nodeIdHandler_RepositoryCollaborator, $nodeId);
};
const oldPlan12 = (_$root, args) => {
  const $delete = pgDeleteSingle(resource_repository_collaboratorPgResource, {
    repository_id: args.getRaw(['input', "repositoryId"]),
    user_id: args.getRaw(['input', "userId"])
  });
  args.apply($delete);
  return object({
    result: $delete
  });
};
const planWrapper12 = (plan, _, fieldArgs) => {
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
const specFromArgs_User2 = args => {
  const $nodeId = args.getRaw(["input", "id"]);
  return specFromNodeId(nodeIdHandler_User, $nodeId);
};
const oldPlan13 = (_$root, args) => {
  const $delete = pgDeleteSingle(resource_userPgResource, {
    id: args.getRaw(['input', "rowId"])
  });
  args.apply($delete);
  return object({
    result: $delete
  });
};
const planWrapper13 = (plan, _, fieldArgs) => {
  const $input = fieldArgs.getRaw(["input", "rowId"]),
    $observer = context().get("observer");
  sideEffect([$input, $observer], async ([input, observer]) => {
    if (!observer) throw Error("Unauthorized");
    if ("delete" === "create") throw Error("Unauthorized");
    if ("delete" === "update" || "delete" === "delete") {
      if (input !== observer.id) throw Error("Unauthorized");
    }
  });
  return plan();
};
const specFromArgs_Repository2 = args => {
  const $nodeId = args.getRaw(["input", "id"]);
  return specFromNodeId(nodeIdHandler_Repository, $nodeId);
};
const oldPlan14 = (_$root, args) => {
  const $delete = pgDeleteSingle(resource_repositoryPgResource, {
    id: args.getRaw(['input', "rowId"])
  });
  args.apply($delete);
  return object({
    result: $delete
  });
};
const planWrapper14 = (plan, _, fieldArgs) => {
  const $input = fieldArgs.getRaw(["input", "rowId"]),
    $observer = context().get("observer"),
    $db = context().get("db");
  sideEffect([$input, $observer, $db], async ([input, observer, db]) => {
    if (!observer) throw Error("Unauthorized");
    if ("delete" === "create") {
      const organizationId = input.organizationId;
      if (!organizationId) return;
      const organization = await db.query.organizationTable.findFirst({
        where(table, {
          eq
        }) {
          return eq(table.id, organizationId);
        },
        with: {
          organizationMembers: {
            where(table, {
              eq
            }) {
              return eq(table.userId, observer.id);
            }
          },
          repositories: !0
        }
      });
      if (!organization) throw Error("Unauthorized");
      if (!organization.organizationMembers.length) throw Error("Unauthorized");
      if (!billingBypassSlugs.includes(organization.slug)) {
        if (organization.tier === "free") {
          if (organization.repositories.length >= 5) throw Error("Maximum number of repositories reached");
        }
        if (organization.tier === "basic") {
          if (organization.repositories.length >= 25) throw Error("Maximum number of repositories reached");
        }
      }
    } else {
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
      if ("delete" === "delete") {
        if (!isOwner) throw Error("Unauthorized");
      } else if ("delete" === "update") {
        if (!isOwner && !isAdminCollaborator) throw Error("Unauthorized");
      }
    }
  });
  return plan();
};
const specFromArgs_Organization2 = args => {
  const $nodeId = args.getRaw(["input", "id"]);
  return specFromNodeId(nodeIdHandler_Organization, $nodeId);
};
const oldPlan15 = (_$root, args) => {
  const $delete = pgDeleteSingle(resource_organizationPgResource, {
    id: args.getRaw(['input', "rowId"])
  });
  args.apply($delete);
  return object({
    result: $delete
  });
};
const planWrapper15 = (plan, _, fieldArgs) => {
  const $input = fieldArgs.getRaw(["input", "rowId"]),
    $observer = context().get("observer"),
    $db = context().get("db");
  sideEffect([$input, $observer, $db], async ([input, observer, db]) => {
    if (!observer) throw Error("Unauthorized");
    if ("delete" !== "create") {
      const organization = await db.query.organizationTable.findFirst({
        where(table, {
          eq
        }) {
          return eq(table.id, input);
        },
        with: {
          organizationMembers: {
            where(table, {
              eq
            }) {
              return eq(table.userId, observer.id);
            }
          }
        }
      });
      if (!organization || !organization.organizationMembers.length) throw Error("Unauthorized");
      const role = organization.organizationMembers[0].role;
      if ("delete" === "delete") {
        if (role !== "owner") throw Error("Unauthorized");
      } else if ("delete" === "update") {
        if (role === "member") throw Error("Unauthorized");
      }
    }
  });
  return plan();
};
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
export const typeDefs = /* GraphQL */`"""The root query type which gives access points into the data universe."""
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

  """Get a single \`OrganizationMember\`."""
  organizationMember(organizationId: UUID!, userId: UUID!): OrganizationMember

  """Get a single \`RepositoryCollaborator\`."""
  repositoryCollaborator(repositoryId: UUID!, userId: UUID!): RepositoryCollaborator

  """Get a single \`User\`."""
  user(rowId: UUID!): User

  """Get a single \`User\`."""
  userByEmail(email: String!): User

  """Get a single \`User\`."""
  userByIdentityProviderId(identityProviderId: UUID!): User

  """Get a single \`User\`."""
  userByUsername(username: String!): User

  """Get a single \`Repository\`."""
  repository(rowId: UUID!): Repository

  """Get a single \`Organization\`."""
  organization(rowId: UUID!): Organization

  """Get a single \`Organization\`."""
  organizationBySlug(slug: String!): Organization

  """Reads a single \`OrganizationMember\` using its globally unique \`ID\`."""
  organizationMemberById(
    """
    The globally unique \`ID\` to be used in selecting a single \`OrganizationMember\`.
    """
    id: ID!
  ): OrganizationMember

  """
  Reads a single \`RepositoryCollaborator\` using its globally unique \`ID\`.
  """
  repositoryCollaboratorById(
    """
    The globally unique \`ID\` to be used in selecting a single \`RepositoryCollaborator\`.
    """
    id: ID!
  ): RepositoryCollaborator

  """Reads a single \`User\` using its globally unique \`ID\`."""
  userById(
    """The globally unique \`ID\` to be used in selecting a single \`User\`."""
    id: ID!
  ): User

  """Reads a single \`Repository\` using its globally unique \`ID\`."""
  repositoryById(
    """
    The globally unique \`ID\` to be used in selecting a single \`Repository\`.
    """
    id: ID!
  ): Repository

  """Reads a single \`Organization\` using its globally unique \`ID\`."""
  organizationById(
    """
    The globally unique \`ID\` to be used in selecting a single \`Organization\`.
    """
    id: ID!
  ): Organization

  """Reads and enables pagination through a set of \`OrganizationMember\`."""
  organizationMembers(
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
    condition: OrganizationMemberCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: OrganizationMemberFilter

    """The method to use when ordering \`OrganizationMember\`."""
    orderBy: [OrganizationMemberOrderBy!] = [PRIMARY_KEY_ASC]
  ): OrganizationMemberConnection

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
}

"""An object with a globally unique \`ID\`."""
interface Node {
  """
  A globally unique identifier. Can be used in various places throughout the system to identify this single value.
  """
  id: ID!
}

type OrganizationMember implements Node {
  """
  A globally unique identifier. Can be used in various places throughout the system to identify this single value.
  """
  id: ID!
  organizationId: UUID!
  userId: UUID!
  role: Role!
  createdAt: Datetime!
  updatedAt: Datetime!

  """
  Reads a single \`Organization\` that is related to this \`OrganizationMember\`.
  """
  organization: Organization

  """Reads a single \`User\` that is related to this \`OrganizationMember\`."""
  user: User
}

"""
A universally unique identifier as defined by [RFC 4122](https://tools.ietf.org/html/rfc4122).
"""
scalar UUID

enum Role {
  owner
  admin
  member
}

"""
A point in time as described by the [ISO
8601](https://en.wikipedia.org/wiki/ISO_8601) and, if it has a timezone, [RFC
3339](https://datatracker.ietf.org/doc/html/rfc3339) standards. Input values
that do not conform to both ISO 8601 and RFC 3339 may be coerced, which may lead
to unexpected results.
"""
scalar Datetime

type Organization implements Node {
  """
  A globally unique identifier. Can be used in various places throughout the system to identify this single value.
  """
  id: ID!
  rowId: UUID!
  name: String!
  slug: String!
  description: String
  avatarUrl: String
  tier: Tier!
  stripeCustomerId: String
  stripeSubscriptionId: String
  createdAt: Datetime!
  updatedAt: Datetime!

  """Reads and enables pagination through a set of \`OrganizationMember\`."""
  organizationMembers(
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
    condition: OrganizationMemberCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: OrganizationMemberFilter

    """The method to use when ordering \`OrganizationMember\`."""
    orderBy: [OrganizationMemberOrderBy!] = [PRIMARY_KEY_ASC]
  ): OrganizationMemberConnection!

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
}

enum Tier {
  free
  basic
  team
}

"""A connection to a list of \`OrganizationMember\` values."""
type OrganizationMemberConnection {
  """A list of \`OrganizationMember\` objects."""
  nodes: [OrganizationMember!]!

  """
  A list of edges which contains the \`OrganizationMember\` and cursor to aid in pagination.
  """
  edges: [OrganizationMemberEdge!]!

  """Information to aid in pagination."""
  pageInfo: PageInfo!

  """
  The count of *all* \`OrganizationMember\` you could get from the connection.
  """
  totalCount: Int!

  """
  Aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  aggregates: OrganizationMemberAggregates

  """
  Grouped aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  groupedAggregates(
    """
    The method to use when grouping \`OrganizationMember\` for these aggregates.
    """
    groupBy: [OrganizationMemberGroupBy!]!

    """Conditions on the grouped aggregates."""
    having: OrganizationMemberHavingInput
  ): [OrganizationMemberAggregates!]
}

"""A \`OrganizationMember\` edge in the connection."""
type OrganizationMemberEdge {
  """A cursor for use in pagination."""
  cursor: Cursor

  """The \`OrganizationMember\` at the end of the edge."""
  node: OrganizationMember!
}

"""A location in a connection that can be used for resuming pagination."""
scalar Cursor

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

type OrganizationMemberAggregates {
  keys: [String]

  """
  Distinct count aggregates across the matching connection (ignoring before/after/first/last/offset)
  """
  distinctCount: OrganizationMemberDistinctCountAggregates
}

type OrganizationMemberDistinctCountAggregates {
  """Distinct count of organizationId across the matching connection"""
  organizationId: BigInt

  """Distinct count of userId across the matching connection"""
  userId: BigInt

  """Distinct count of role across the matching connection"""
  role: BigInt

  """Distinct count of createdAt across the matching connection"""
  createdAt: BigInt

  """Distinct count of updatedAt across the matching connection"""
  updatedAt: BigInt
}

"""
A signed eight-byte integer. The upper big integer values are greater than the
max value for a JavaScript number. Therefore all big integers will be output as
strings and not numbers.
"""
scalar BigInt

"""
Grouping methods for \`OrganizationMember\` for usage during aggregation.
"""
enum OrganizationMemberGroupBy {
  ORGANIZATION_ID
  USER_ID
  ROLE
  CREATED_AT
  CREATED_AT_TRUNCATED_TO_HOUR
  CREATED_AT_TRUNCATED_TO_DAY
  UPDATED_AT
  UPDATED_AT_TRUNCATED_TO_HOUR
  UPDATED_AT_TRUNCATED_TO_DAY
}

"""Conditions for \`OrganizationMember\` aggregates."""
input OrganizationMemberHavingInput {
  AND: [OrganizationMemberHavingInput!]
  OR: [OrganizationMemberHavingInput!]
  sum: OrganizationMemberHavingSumInput
  distinctCount: OrganizationMemberHavingDistinctCountInput
  min: OrganizationMemberHavingMinInput
  max: OrganizationMemberHavingMaxInput
  average: OrganizationMemberHavingAverageInput
  stddevSample: OrganizationMemberHavingStddevSampleInput
  stddevPopulation: OrganizationMemberHavingStddevPopulationInput
  varianceSample: OrganizationMemberHavingVarianceSampleInput
  variancePopulation: OrganizationMemberHavingVariancePopulationInput
}

input OrganizationMemberHavingSumInput {
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

input OrganizationMemberHavingDistinctCountInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input OrganizationMemberHavingMinInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input OrganizationMemberHavingMaxInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input OrganizationMemberHavingAverageInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input OrganizationMemberHavingStddevSampleInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input OrganizationMemberHavingStddevPopulationInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input OrganizationMemberHavingVarianceSampleInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input OrganizationMemberHavingVariancePopulationInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

"""
A condition to be used against \`OrganizationMember\` object types. All fields are
tested for equality and combined with a logical ‘and.’
"""
input OrganizationMemberCondition {
  """Checks for equality with the object’s \`organizationId\` field."""
  organizationId: UUID

  """Checks for equality with the object’s \`userId\` field."""
  userId: UUID

  """Checks for equality with the object’s \`role\` field."""
  role: Role

  """Checks for equality with the object’s \`createdAt\` field."""
  createdAt: Datetime

  """Checks for equality with the object’s \`updatedAt\` field."""
  updatedAt: Datetime
}

"""
A filter to be used against \`OrganizationMember\` object types. All fields are combined with a logical ‘and.’
"""
input OrganizationMemberFilter {
  """Filter by the object’s \`organizationId\` field."""
  organizationId: UUIDFilter

  """Filter by the object’s \`userId\` field."""
  userId: UUIDFilter

  """Filter by the object’s \`role\` field."""
  role: RoleFilter

  """Filter by the object’s \`createdAt\` field."""
  createdAt: DatetimeFilter

  """Filter by the object’s \`updatedAt\` field."""
  updatedAt: DatetimeFilter

  """Filter by the object’s \`organization\` relation."""
  organization: OrganizationFilter

  """Filter by the object’s \`user\` relation."""
  user: UserFilter

  """Checks for all expressions in this list."""
  and: [OrganizationMemberFilter!]

  """Checks for any expressions in this list."""
  or: [OrganizationMemberFilter!]

  """Negates the expression."""
  not: OrganizationMemberFilter
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
A filter to be used against Role fields. All fields are combined with a logical ‘and.’
"""
input RoleFilter {
  """
  Is null (if \`true\` is specified) or is not null (if \`false\` is specified).
  """
  isNull: Boolean

  """Equal to the specified value."""
  equalTo: Role

  """Not equal to the specified value."""
  notEqualTo: Role

  """
  Not equal to the specified value, treating null like an ordinary value.
  """
  distinctFrom: Role

  """Equal to the specified value, treating null like an ordinary value."""
  notDistinctFrom: Role

  """Included in the specified list."""
  in: [Role!]

  """Not included in the specified list."""
  notIn: [Role!]

  """Less than the specified value."""
  lessThan: Role

  """Less than or equal to the specified value."""
  lessThanOrEqualTo: Role

  """Greater than the specified value."""
  greaterThan: Role

  """Greater than or equal to the specified value."""
  greaterThanOrEqualTo: Role
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
A filter to be used against \`Organization\` object types. All fields are combined with a logical ‘and.’
"""
input OrganizationFilter {
  """Filter by the object’s \`rowId\` field."""
  rowId: UUIDFilter

  """Filter by the object’s \`name\` field."""
  name: StringFilter

  """Filter by the object’s \`slug\` field."""
  slug: StringFilter

  """Filter by the object’s \`description\` field."""
  description: StringFilter

  """Filter by the object’s \`avatarUrl\` field."""
  avatarUrl: StringFilter

  """Filter by the object’s \`tier\` field."""
  tier: TierFilter

  """Filter by the object’s \`stripeCustomerId\` field."""
  stripeCustomerId: StringFilter

  """Filter by the object’s \`stripeSubscriptionId\` field."""
  stripeSubscriptionId: StringFilter

  """Filter by the object’s \`createdAt\` field."""
  createdAt: DatetimeFilter

  """Filter by the object’s \`updatedAt\` field."""
  updatedAt: DatetimeFilter

  """Filter by the object’s \`organizationMembers\` relation."""
  organizationMembers: OrganizationToManyOrganizationMemberFilter

  """Some related \`organizationMembers\` exist."""
  organizationMembersExist: Boolean

  """Filter by the object’s \`repositories\` relation."""
  repositories: OrganizationToManyRepositoryFilter

  """Some related \`repositories\` exist."""
  repositoriesExist: Boolean

  """Checks for all expressions in this list."""
  and: [OrganizationFilter!]

  """Checks for any expressions in this list."""
  or: [OrganizationFilter!]

  """Negates the expression."""
  not: OrganizationFilter
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
A filter to be used against Tier fields. All fields are combined with a logical ‘and.’
"""
input TierFilter {
  """
  Is null (if \`true\` is specified) or is not null (if \`false\` is specified).
  """
  isNull: Boolean

  """Equal to the specified value."""
  equalTo: Tier

  """Not equal to the specified value."""
  notEqualTo: Tier

  """
  Not equal to the specified value, treating null like an ordinary value.
  """
  distinctFrom: Tier

  """Equal to the specified value, treating null like an ordinary value."""
  notDistinctFrom: Tier

  """Included in the specified list."""
  in: [Tier!]

  """Not included in the specified list."""
  notIn: [Tier!]

  """Less than the specified value."""
  lessThan: Tier

  """Less than or equal to the specified value."""
  lessThanOrEqualTo: Tier

  """Greater than the specified value."""
  greaterThan: Tier

  """Greater than or equal to the specified value."""
  greaterThanOrEqualTo: Tier
}

"""
A filter to be used against many \`OrganizationMember\` object types. All fields are combined with a logical ‘and.’
"""
input OrganizationToManyOrganizationMemberFilter {
  """
  Every related \`OrganizationMember\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  every: OrganizationMemberFilter

  """
  Some related \`OrganizationMember\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  some: OrganizationMemberFilter

  """
  No related \`OrganizationMember\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  none: OrganizationMemberFilter

  """
  Aggregates across related \`OrganizationMember\` match the filter criteria.
  """
  aggregates: OrganizationMemberAggregatesFilter
}

"""
A filter to be used against aggregates of \`OrganizationMember\` object types.
"""
input OrganizationMemberAggregatesFilter {
  """
  A filter that must pass for the relevant \`OrganizationMember\` object to be included within the aggregate.
  """
  filter: OrganizationMemberFilter

  """Distinct count aggregate over matching \`OrganizationMember\` objects."""
  distinctCount: OrganizationMemberDistinctCountAggregateFilter
}

input OrganizationMemberDistinctCountAggregateFilter {
  organizationId: BigIntFilter
  userId: BigIntFilter
  role: BigIntFilter
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

enum Visibility {
  public
  private
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

  """Filter by the object’s \`organizationMembers\` relation."""
  organizationMembers: UserToManyOrganizationMemberFilter

  """Some related \`organizationMembers\` exist."""
  organizationMembersExist: Boolean

  """Filter by the object’s \`repositoriesByOwnerId\` relation."""
  repositoriesByOwnerId: UserToManyRepositoryFilter

  """Some related \`repositoriesByOwnerId\` exist."""
  repositoriesByOwnerIdExist: Boolean

  """Filter by the object’s \`repositoryCollaborators\` relation."""
  repositoryCollaborators: UserToManyRepositoryCollaboratorFilter

  """Some related \`repositoryCollaborators\` exist."""
  repositoryCollaboratorsExist: Boolean

  """Checks for all expressions in this list."""
  and: [UserFilter!]

  """Checks for any expressions in this list."""
  or: [UserFilter!]

  """Negates the expression."""
  not: UserFilter
}

"""
A filter to be used against many \`OrganizationMember\` object types. All fields are combined with a logical ‘and.’
"""
input UserToManyOrganizationMemberFilter {
  """
  Every related \`OrganizationMember\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  every: OrganizationMemberFilter

  """
  Some related \`OrganizationMember\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  some: OrganizationMemberFilter

  """
  No related \`OrganizationMember\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  none: OrganizationMemberFilter

  """
  Aggregates across related \`OrganizationMember\` match the filter criteria.
  """
  aggregates: OrganizationMemberAggregatesFilter
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

"""Methods to use when ordering \`OrganizationMember\`."""
enum OrganizationMemberOrderBy {
  NATURAL
  PRIMARY_KEY_ASC
  PRIMARY_KEY_DESC
  ORGANIZATION_ID_ASC
  ORGANIZATION_ID_DESC
  USER_ID_ASC
  USER_ID_DESC
  ROLE_ASC
  ROLE_DESC
  CREATED_AT_ASC
  CREATED_AT_DESC
  UPDATED_AT_ASC
  UPDATED_AT_DESC
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

  """Reads and enables pagination through a set of \`OrganizationMember\`."""
  organizationMembers(
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
    condition: OrganizationMemberCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: OrganizationMemberFilter

    """The method to use when ordering \`OrganizationMember\`."""
    orderBy: [OrganizationMemberOrderBy!] = [PRIMARY_KEY_ASC]
  ): OrganizationMemberConnection!

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
}

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
  ORGANIZATION_MEMBERS_COUNT_ASC
  ORGANIZATION_MEMBERS_COUNT_DESC
  ORGANIZATION_MEMBERS_DISTINCT_COUNT_ORGANIZATION_ID_ASC
  ORGANIZATION_MEMBERS_DISTINCT_COUNT_ORGANIZATION_ID_DESC
  ORGANIZATION_MEMBERS_DISTINCT_COUNT_USER_ID_ASC
  ORGANIZATION_MEMBERS_DISTINCT_COUNT_USER_ID_DESC
  ORGANIZATION_MEMBERS_DISTINCT_COUNT_ROLE_ASC
  ORGANIZATION_MEMBERS_DISTINCT_COUNT_ROLE_DESC
  ORGANIZATION_MEMBERS_DISTINCT_COUNT_CREATED_AT_ASC
  ORGANIZATION_MEMBERS_DISTINCT_COUNT_CREATED_AT_DESC
  ORGANIZATION_MEMBERS_DISTINCT_COUNT_UPDATED_AT_ASC
  ORGANIZATION_MEMBERS_DISTINCT_COUNT_UPDATED_AT_DESC
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

  """Distinct count of name across the matching connection"""
  name: BigInt

  """Distinct count of slug across the matching connection"""
  slug: BigInt

  """Distinct count of description across the matching connection"""
  description: BigInt

  """Distinct count of avatarUrl across the matching connection"""
  avatarUrl: BigInt

  """Distinct count of tier across the matching connection"""
  tier: BigInt

  """Distinct count of stripeCustomerId across the matching connection"""
  stripeCustomerId: BigInt

  """Distinct count of stripeSubscriptionId across the matching connection"""
  stripeSubscriptionId: BigInt

  """Distinct count of createdAt across the matching connection"""
  createdAt: BigInt

  """Distinct count of updatedAt across the matching connection"""
  updatedAt: BigInt
}

"""Grouping methods for \`Organization\` for usage during aggregation."""
enum OrganizationGroupBy {
  NAME
  DESCRIPTION
  AVATAR_URL
  TIER
  STRIPE_CUSTOMER_ID
  STRIPE_SUBSCRIPTION_ID
  CREATED_AT
  CREATED_AT_TRUNCATED_TO_HOUR
  CREATED_AT_TRUNCATED_TO_DAY
  UPDATED_AT
  UPDATED_AT_TRUNCATED_TO_HOUR
  UPDATED_AT_TRUNCATED_TO_DAY
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
}

input OrganizationHavingDistinctCountInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input OrganizationHavingMinInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input OrganizationHavingMaxInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input OrganizationHavingAverageInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input OrganizationHavingStddevSampleInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input OrganizationHavingStddevPopulationInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input OrganizationHavingVarianceSampleInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

input OrganizationHavingVariancePopulationInput {
  createdAt: HavingDatetimeFilter
  updatedAt: HavingDatetimeFilter
}

"""
A condition to be used against \`Organization\` object types. All fields are
tested for equality and combined with a logical ‘and.’
"""
input OrganizationCondition {
  """Checks for equality with the object’s \`rowId\` field."""
  rowId: UUID

  """Checks for equality with the object’s \`name\` field."""
  name: String

  """Checks for equality with the object’s \`slug\` field."""
  slug: String

  """Checks for equality with the object’s \`description\` field."""
  description: String

  """Checks for equality with the object’s \`avatarUrl\` field."""
  avatarUrl: String

  """Checks for equality with the object’s \`tier\` field."""
  tier: Tier

  """Checks for equality with the object’s \`stripeCustomerId\` field."""
  stripeCustomerId: String

  """Checks for equality with the object’s \`stripeSubscriptionId\` field."""
  stripeSubscriptionId: String

  """Checks for equality with the object’s \`createdAt\` field."""
  createdAt: Datetime

  """Checks for equality with the object’s \`updatedAt\` field."""
  updatedAt: Datetime
}

"""Methods to use when ordering \`Organization\`."""
enum OrganizationOrderBy {
  NATURAL
  PRIMARY_KEY_ASC
  PRIMARY_KEY_DESC
  ROW_ID_ASC
  ROW_ID_DESC
  NAME_ASC
  NAME_DESC
  SLUG_ASC
  SLUG_DESC
  DESCRIPTION_ASC
  DESCRIPTION_DESC
  AVATAR_URL_ASC
  AVATAR_URL_DESC
  TIER_ASC
  TIER_DESC
  STRIPE_CUSTOMER_ID_ASC
  STRIPE_CUSTOMER_ID_DESC
  STRIPE_SUBSCRIPTION_ID_ASC
  STRIPE_SUBSCRIPTION_ID_DESC
  CREATED_AT_ASC
  CREATED_AT_DESC
  UPDATED_AT_ASC
  UPDATED_AT_DESC
  ORGANIZATION_MEMBERS_COUNT_ASC
  ORGANIZATION_MEMBERS_COUNT_DESC
  ORGANIZATION_MEMBERS_DISTINCT_COUNT_ORGANIZATION_ID_ASC
  ORGANIZATION_MEMBERS_DISTINCT_COUNT_ORGANIZATION_ID_DESC
  ORGANIZATION_MEMBERS_DISTINCT_COUNT_USER_ID_ASC
  ORGANIZATION_MEMBERS_DISTINCT_COUNT_USER_ID_DESC
  ORGANIZATION_MEMBERS_DISTINCT_COUNT_ROLE_ASC
  ORGANIZATION_MEMBERS_DISTINCT_COUNT_ROLE_DESC
  ORGANIZATION_MEMBERS_DISTINCT_COUNT_CREATED_AT_ASC
  ORGANIZATION_MEMBERS_DISTINCT_COUNT_CREATED_AT_DESC
  ORGANIZATION_MEMBERS_DISTINCT_COUNT_UPDATED_AT_ASC
  ORGANIZATION_MEMBERS_DISTINCT_COUNT_UPDATED_AT_DESC
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
}

"""
The root mutation type which contains root level fields which mutate data.
"""
type Mutation {
  """Creates a single \`OrganizationMember\`."""
  createOrganizationMember(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: CreateOrganizationMemberInput!
  ): CreateOrganizationMemberPayload

  """Creates a single \`RepositoryCollaborator\`."""
  createRepositoryCollaborator(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: CreateRepositoryCollaboratorInput!
  ): CreateRepositoryCollaboratorPayload

  """Creates a single \`User\`."""
  createUser(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: CreateUserInput!
  ): CreateUserPayload

  """Creates a single \`Repository\`."""
  createRepository(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: CreateRepositoryInput!
  ): CreateRepositoryPayload

  """Creates a single \`Organization\`."""
  createOrganization(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: CreateOrganizationInput!
  ): CreateOrganizationPayload

  """
  Updates a single \`OrganizationMember\` using its globally unique id and a patch.
  """
  updateOrganizationMemberById(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: UpdateOrganizationMemberByIdInput!
  ): UpdateOrganizationMemberPayload

  """Updates a single \`OrganizationMember\` using a unique key and a patch."""
  updateOrganizationMember(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: UpdateOrganizationMemberInput!
  ): UpdateOrganizationMemberPayload

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

  """Deletes a single \`OrganizationMember\` using its globally unique id."""
  deleteOrganizationMemberById(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: DeleteOrganizationMemberByIdInput!
  ): DeleteOrganizationMemberPayload

  """Deletes a single \`OrganizationMember\` using a unique key."""
  deleteOrganizationMember(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: DeleteOrganizationMemberInput!
  ): DeleteOrganizationMemberPayload

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
}

"""The output of our create \`OrganizationMember\` mutation."""
type CreateOrganizationMemberPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`OrganizationMember\` that was created by this mutation."""
  organizationMember: OrganizationMember

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`OrganizationMember\`. May be used by Relay 1."""
  organizationMemberEdge(
    """The method to use when ordering \`OrganizationMember\`."""
    orderBy: [OrganizationMemberOrderBy!]! = [PRIMARY_KEY_ASC]
  ): OrganizationMemberEdge
}

"""All input for the create \`OrganizationMember\` mutation."""
input CreateOrganizationMemberInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """The \`OrganizationMember\` to be created by this mutation."""
  organizationMember: OrganizationMemberInput!
}

"""An input for mutations affecting \`OrganizationMember\`"""
input OrganizationMemberInput {
  organizationId: UUID!
  userId: UUID!
  role: Role
  createdAt: Datetime
  updatedAt: Datetime
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
  name: String!
  slug: String!
  description: String
  avatarUrl: String
  stripeCustomerId: String
  createdAt: Datetime
  updatedAt: Datetime
}

"""The output of our update \`OrganizationMember\` mutation."""
type UpdateOrganizationMemberPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`OrganizationMember\` that was updated by this mutation."""
  organizationMember: OrganizationMember

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`OrganizationMember\`. May be used by Relay 1."""
  organizationMemberEdge(
    """The method to use when ordering \`OrganizationMember\`."""
    orderBy: [OrganizationMemberOrderBy!]! = [PRIMARY_KEY_ASC]
  ): OrganizationMemberEdge
}

"""All input for the \`updateOrganizationMemberById\` mutation."""
input UpdateOrganizationMemberByIdInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """
  The globally unique \`ID\` which will identify a single \`OrganizationMember\` to be updated.
  """
  id: ID!

  """
  An object where the defined keys will be set on the \`OrganizationMember\` being updated.
  """
  patch: OrganizationMemberPatch!
}

"""
Represents an update to a \`OrganizationMember\`. Fields that are set will be updated.
"""
input OrganizationMemberPatch {
  organizationId: UUID
  userId: UUID
  role: Role
  createdAt: Datetime
  updatedAt: Datetime
}

"""All input for the \`updateOrganizationMember\` mutation."""
input UpdateOrganizationMemberInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String
  organizationId: UUID!
  userId: UUID!

  """
  An object where the defined keys will be set on the \`OrganizationMember\` being updated.
  """
  patch: OrganizationMemberPatch!
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
  name: String
  slug: String
  description: String
  avatarUrl: String
  stripeCustomerId: String
  createdAt: Datetime
  updatedAt: Datetime
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

"""The output of our delete \`OrganizationMember\` mutation."""
type DeleteOrganizationMemberPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`OrganizationMember\` that was deleted by this mutation."""
  organizationMember: OrganizationMember
  deletedOrganizationMemberId: ID

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`OrganizationMember\`. May be used by Relay 1."""
  organizationMemberEdge(
    """The method to use when ordering \`OrganizationMember\`."""
    orderBy: [OrganizationMemberOrderBy!]! = [PRIMARY_KEY_ASC]
  ): OrganizationMemberEdge
}

"""All input for the \`deleteOrganizationMemberById\` mutation."""
input DeleteOrganizationMemberByIdInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """
  The globally unique \`ID\` which will identify a single \`OrganizationMember\` to be deleted.
  """
  id: ID!
}

"""All input for the \`deleteOrganizationMember\` mutation."""
input DeleteOrganizationMemberInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String
  organizationId: UUID!
  userId: UUID!
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
}`;
export const objects = {
  Query: {
    assertStep() {
      return !0;
    },
    plans: {
      id($parent) {
        const specifier = nodeIdHandler_Query.plan($parent);
        return lambda(specifier, nodeIdCodecs[nodeIdHandler_Query.codec.name].encode);
      },
      node(_$root, fieldArgs) {
        return fieldArgs.getRaw("id");
      },
      organization(_$root, {
        $rowId
      }) {
        return resource_organizationPgResource.get({
          id: $rowId
        });
      },
      organizationById(_$parent, args) {
        const $nodeId = args.getRaw("id");
        return nodeFetcher_Organization($nodeId);
      },
      organizationBySlug(_$root, {
        $slug
      }) {
        return resource_organizationPgResource.get({
          slug: $slug
        });
      },
      organizationMember(_$root, {
        $organizationId,
        $userId
      }) {
        return resource_organization_memberPgResource.get({
          organization_id: $organizationId,
          user_id: $userId
        });
      },
      organizationMemberById(_$parent, args) {
        const $nodeId = args.getRaw("id");
        return nodeFetcher_OrganizationMember($nodeId);
      },
      organizationMembers: {
        plan() {
          return connection(resource_organization_memberPgResource.find());
        },
        args: {
          first(_, $connection, arg) {
            $connection.setFirst(arg.getRaw());
          },
          last(_, $connection, val) {
            $connection.setLast(val.getRaw());
          },
          offset(_, $connection, val) {
            $connection.setOffset(val.getRaw());
          },
          before(_, $connection, val) {
            $connection.setBefore(val.getRaw());
          },
          after(_, $connection, val) {
            $connection.setAfter(val.getRaw());
          },
          condition(_condition, $connection, arg) {
            const $select = $connection.getSubplan();
            arg.apply($select, qbWhereBuilder);
          },
          filter(_, $connection, fieldArg) {
            const $pgSelect = $connection.getSubplan();
            fieldArg.apply($pgSelect, (queryBuilder, value) => {
              assertAllowed(value, "object");
              if (value == null) return;
              const condition = new PgCondition(queryBuilder);
              return condition;
            });
          },
          orderBy(parent, $connection, value) {
            const $select = $connection.getSubplan();
            value.apply($select);
          }
        }
      },
      organizations: {
        plan() {
          return connection(resource_organizationPgResource.find());
        },
        args: {
          first(_, $connection, arg) {
            $connection.setFirst(arg.getRaw());
          },
          last(_, $connection, val) {
            $connection.setLast(val.getRaw());
          },
          offset(_, $connection, val) {
            $connection.setOffset(val.getRaw());
          },
          before(_, $connection, val) {
            $connection.setBefore(val.getRaw());
          },
          after(_, $connection, val) {
            $connection.setAfter(val.getRaw());
          },
          condition(_condition, $connection, arg) {
            const $select = $connection.getSubplan();
            arg.apply($select, qbWhereBuilder);
          },
          filter(_, $connection, fieldArg) {
            const $pgSelect = $connection.getSubplan();
            fieldArg.apply($pgSelect, (queryBuilder, value) => {
              assertAllowed5(value, "object");
              if (value == null) return;
              const condition = new PgCondition(queryBuilder);
              return condition;
            });
          },
          orderBy(parent, $connection, value) {
            const $select = $connection.getSubplan();
            value.apply($select);
          }
        }
      },
      query() {
        return rootValue();
      },
      repositories: {
        plan() {
          return connection(resource_repositoryPgResource.find());
        },
        args: {
          first(_, $connection, arg) {
            $connection.setFirst(arg.getRaw());
          },
          last(_, $connection, val) {
            $connection.setLast(val.getRaw());
          },
          offset(_, $connection, val) {
            $connection.setOffset(val.getRaw());
          },
          before(_, $connection, val) {
            $connection.setBefore(val.getRaw());
          },
          after(_, $connection, val) {
            $connection.setAfter(val.getRaw());
          },
          condition(_condition, $connection, arg) {
            const $select = $connection.getSubplan();
            arg.apply($select, qbWhereBuilder);
          },
          filter(_, $connection, fieldArg) {
            const $pgSelect = $connection.getSubplan();
            fieldArg.apply($pgSelect, (queryBuilder, value) => {
              assertAllowed4(value, "object");
              if (value == null) return;
              const condition = new PgCondition(queryBuilder);
              return condition;
            });
          },
          orderBy(parent, $connection, value) {
            const $select = $connection.getSubplan();
            value.apply($select);
          }
        }
      },
      repository(_$root, {
        $rowId
      }) {
        return resource_repositoryPgResource.get({
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
        return resource_repository_collaboratorPgResource.get({
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
          return connection(resource_repository_collaboratorPgResource.find());
        },
        args: {
          first(_, $connection, arg) {
            $connection.setFirst(arg.getRaw());
          },
          last(_, $connection, val) {
            $connection.setLast(val.getRaw());
          },
          offset(_, $connection, val) {
            $connection.setOffset(val.getRaw());
          },
          before(_, $connection, val) {
            $connection.setBefore(val.getRaw());
          },
          after(_, $connection, val) {
            $connection.setAfter(val.getRaw());
          },
          condition(_condition, $connection, arg) {
            const $select = $connection.getSubplan();
            arg.apply($select, qbWhereBuilder);
          },
          filter(_, $connection, fieldArg) {
            const $pgSelect = $connection.getSubplan();
            fieldArg.apply($pgSelect, (queryBuilder, value) => {
              assertAllowed2(value, "object");
              if (value == null) return;
              const condition = new PgCondition(queryBuilder);
              return condition;
            });
          },
          orderBy(parent, $connection, value) {
            const $select = $connection.getSubplan();
            value.apply($select);
          }
        }
      },
      user(_$root, {
        $rowId
      }) {
        return resource_userPgResource.get({
          id: $rowId
        });
      },
      userByEmail(_$root, {
        $email
      }) {
        return resource_userPgResource.get({
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
        return resource_userPgResource.get({
          identity_provider_id: $identityProviderId
        });
      },
      userByUsername(_$root, {
        $username
      }) {
        return resource_userPgResource.get({
          username: $username
        });
      },
      users: {
        plan() {
          return connection(resource_userPgResource.find());
        },
        args: {
          first(_, $connection, arg) {
            $connection.setFirst(arg.getRaw());
          },
          last(_, $connection, val) {
            $connection.setLast(val.getRaw());
          },
          offset(_, $connection, val) {
            $connection.setOffset(val.getRaw());
          },
          before(_, $connection, val) {
            $connection.setBefore(val.getRaw());
          },
          after(_, $connection, val) {
            $connection.setAfter(val.getRaw());
          },
          condition(_condition, $connection, arg) {
            const $select = $connection.getSubplan();
            arg.apply($select, qbWhereBuilder);
          },
          filter(_, $connection, fieldArg) {
            const $pgSelect = $connection.getSubplan();
            fieldArg.apply($pgSelect, (queryBuilder, value) => {
              assertAllowed3(value, "object");
              if (value == null) return;
              const condition = new PgCondition(queryBuilder);
              return condition;
            });
          },
          orderBy(parent, $connection, value) {
            const $select = $connection.getSubplan();
            value.apply($select);
          }
        }
      }
    }
  },
  Mutation: {
    assertStep: __ValueStep,
    plans: {
      createOrganization: {
        plan(...planParams) {
          const smartPlan = (...overrideParams) => {
              const args = [...overrideParams.concat(planParams.slice(overrideParams.length))],
                $prev = oldPlan5.apply(this, args);
              if (!($prev instanceof ExecutableStep)) {
                console.error(`Wrapped a plan function at ${"Mutation"}.${"createOrganization"}, but that function did not return a step!
${String(oldPlan5)}`);
                throw Error("Wrapped a plan function, but that function did not return a step!");
              }
              args[1].autoApply($prev);
              return $prev;
            },
            [$source, fieldArgs, info] = planParams,
            $newPlan = planWrapper5(smartPlan, $source, fieldArgs, info);
          if ($newPlan === void 0) throw Error("Your plan wrapper didn't return anything; it must return a step or null!");
          if ($newPlan !== null && !isExecutableStep($newPlan)) throw Error(`Your plan wrapper returned something other than a step... It must return a step (or null). (Returned: ${inspect($newPlan)})`);
          return $newPlan;
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      createOrganizationMember: {
        plan(...planParams) {
          const smartPlan = (...overrideParams) => {
              const args = [...overrideParams.concat(planParams.slice(overrideParams.length))],
                $prev = oldPlan.apply(this, args);
              if (!($prev instanceof ExecutableStep)) {
                console.error(`Wrapped a plan function at ${"Mutation"}.${"createOrganizationMember"}, but that function did not return a step!
${String(oldPlan)}`);
                throw Error("Wrapped a plan function, but that function did not return a step!");
              }
              args[1].autoApply($prev);
              return $prev;
            },
            [$source, fieldArgs, info] = planParams,
            $newPlan = planWrapper(smartPlan, $source, fieldArgs, info);
          if ($newPlan === void 0) throw Error("Your plan wrapper didn't return anything; it must return a step or null!");
          if ($newPlan !== null && !isExecutableStep($newPlan)) throw Error(`Your plan wrapper returned something other than a step... It must return a step (or null). (Returned: ${inspect($newPlan)})`);
          return $newPlan;
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      createRepository: {
        plan(...planParams) {
          const smartPlan = (...overrideParams) => {
              const args = [...overrideParams.concat(planParams.slice(overrideParams.length))],
                $prev = oldPlan4.apply(this, args);
              if (!($prev instanceof ExecutableStep)) {
                console.error(`Wrapped a plan function at ${"Mutation"}.${"createRepository"}, but that function did not return a step!
${String(oldPlan4)}`);
                throw Error("Wrapped a plan function, but that function did not return a step!");
              }
              args[1].autoApply($prev);
              return $prev;
            },
            [$source, fieldArgs, info] = planParams,
            $newPlan = planWrapper4(smartPlan, $source, fieldArgs, info);
          if ($newPlan === void 0) throw Error("Your plan wrapper didn't return anything; it must return a step or null!");
          if ($newPlan !== null && !isExecutableStep($newPlan)) throw Error(`Your plan wrapper returned something other than a step... It must return a step (or null). (Returned: ${inspect($newPlan)})`);
          return $newPlan;
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      createRepositoryCollaborator: {
        plan(...planParams) {
          const smartPlan = (...overrideParams) => {
              const args = [...overrideParams.concat(planParams.slice(overrideParams.length))],
                $prev = oldPlan2.apply(this, args);
              if (!($prev instanceof ExecutableStep)) {
                console.error(`Wrapped a plan function at ${"Mutation"}.${"createRepositoryCollaborator"}, but that function did not return a step!
${String(oldPlan2)}`);
                throw Error("Wrapped a plan function, but that function did not return a step!");
              }
              args[1].autoApply($prev);
              return $prev;
            },
            [$source, fieldArgs, info] = planParams,
            $newPlan = planWrapper2(smartPlan, $source, fieldArgs, info);
          if ($newPlan === void 0) throw Error("Your plan wrapper didn't return anything; it must return a step or null!");
          if ($newPlan !== null && !isExecutableStep($newPlan)) throw Error(`Your plan wrapper returned something other than a step... It must return a step (or null). (Returned: ${inspect($newPlan)})`);
          return $newPlan;
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      createUser: {
        plan(...planParams) {
          const smartPlan = (...overrideParams) => {
              const args = [...overrideParams.concat(planParams.slice(overrideParams.length))],
                $prev = oldPlan3.apply(this, args);
              if (!($prev instanceof ExecutableStep)) {
                console.error(`Wrapped a plan function at ${"Mutation"}.${"createUser"}, but that function did not return a step!
${String(oldPlan3)}`);
                throw Error("Wrapped a plan function, but that function did not return a step!");
              }
              args[1].autoApply($prev);
              return $prev;
            },
            [$source, fieldArgs, info] = planParams,
            $newPlan = planWrapper3(smartPlan, $source, fieldArgs, info);
          if ($newPlan === void 0) throw Error("Your plan wrapper didn't return anything; it must return a step or null!");
          if ($newPlan !== null && !isExecutableStep($newPlan)) throw Error(`Your plan wrapper returned something other than a step... It must return a step (or null). (Returned: ${inspect($newPlan)})`);
          return $newPlan;
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      deleteOrganization: {
        plan(...planParams) {
          const smartPlan = (...overrideParams) => {
              const args = [...overrideParams.concat(planParams.slice(overrideParams.length))],
                $prev = oldPlan15.apply(this, args);
              if (!($prev instanceof ExecutableStep)) {
                console.error(`Wrapped a plan function at ${"Mutation"}.${"deleteOrganization"}, but that function did not return a step!
${String(oldPlan15)}`);
                throw Error("Wrapped a plan function, but that function did not return a step!");
              }
              args[1].autoApply($prev);
              return $prev;
            },
            [$source, fieldArgs, info] = planParams,
            $newPlan = planWrapper15(smartPlan, $source, fieldArgs, info);
          if ($newPlan === void 0) throw Error("Your plan wrapper didn't return anything; it must return a step or null!");
          if ($newPlan !== null && !isExecutableStep($newPlan)) throw Error(`Your plan wrapper returned something other than a step... It must return a step (or null). (Returned: ${inspect($newPlan)})`);
          return $newPlan;
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      deleteOrganizationById: {
        plan(_$root, args) {
          const $delete = pgDeleteSingle(resource_organizationPgResource, specFromArgs_Organization2(args));
          args.apply($delete);
          return object({
            result: $delete
          });
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      deleteOrganizationMember: {
        plan(...planParams) {
          const smartPlan = (...overrideParams) => {
              const args = [...overrideParams.concat(planParams.slice(overrideParams.length))],
                $prev = oldPlan11.apply(this, args);
              if (!($prev instanceof ExecutableStep)) {
                console.error(`Wrapped a plan function at ${"Mutation"}.${"deleteOrganizationMember"}, but that function did not return a step!
${String(oldPlan11)}`);
                throw Error("Wrapped a plan function, but that function did not return a step!");
              }
              args[1].autoApply($prev);
              return $prev;
            },
            [$source, fieldArgs, info] = planParams,
            $newPlan = planWrapper11(smartPlan, $source, fieldArgs, info);
          if ($newPlan === void 0) throw Error("Your plan wrapper didn't return anything; it must return a step or null!");
          if ($newPlan !== null && !isExecutableStep($newPlan)) throw Error(`Your plan wrapper returned something other than a step... It must return a step (or null). (Returned: ${inspect($newPlan)})`);
          return $newPlan;
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      deleteOrganizationMemberById: {
        plan(_$root, args) {
          const $delete = pgDeleteSingle(resource_organization_memberPgResource, specFromArgs_OrganizationMember2(args));
          args.apply($delete);
          return object({
            result: $delete
          });
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      deleteRepository: {
        plan(...planParams) {
          const smartPlan = (...overrideParams) => {
              const args = [...overrideParams.concat(planParams.slice(overrideParams.length))],
                $prev = oldPlan14.apply(this, args);
              if (!($prev instanceof ExecutableStep)) {
                console.error(`Wrapped a plan function at ${"Mutation"}.${"deleteRepository"}, but that function did not return a step!
${String(oldPlan14)}`);
                throw Error("Wrapped a plan function, but that function did not return a step!");
              }
              args[1].autoApply($prev);
              return $prev;
            },
            [$source, fieldArgs, info] = planParams,
            $newPlan = planWrapper14(smartPlan, $source, fieldArgs, info);
          if ($newPlan === void 0) throw Error("Your plan wrapper didn't return anything; it must return a step or null!");
          if ($newPlan !== null && !isExecutableStep($newPlan)) throw Error(`Your plan wrapper returned something other than a step... It must return a step (or null). (Returned: ${inspect($newPlan)})`);
          return $newPlan;
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      deleteRepositoryById: {
        plan(_$root, args) {
          const $delete = pgDeleteSingle(resource_repositoryPgResource, specFromArgs_Repository2(args));
          args.apply($delete);
          return object({
            result: $delete
          });
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      deleteRepositoryCollaborator: {
        plan(...planParams) {
          const smartPlan = (...overrideParams) => {
              const args = [...overrideParams.concat(planParams.slice(overrideParams.length))],
                $prev = oldPlan12.apply(this, args);
              if (!($prev instanceof ExecutableStep)) {
                console.error(`Wrapped a plan function at ${"Mutation"}.${"deleteRepositoryCollaborator"}, but that function did not return a step!
${String(oldPlan12)}`);
                throw Error("Wrapped a plan function, but that function did not return a step!");
              }
              args[1].autoApply($prev);
              return $prev;
            },
            [$source, fieldArgs, info] = planParams,
            $newPlan = planWrapper12(smartPlan, $source, fieldArgs, info);
          if ($newPlan === void 0) throw Error("Your plan wrapper didn't return anything; it must return a step or null!");
          if ($newPlan !== null && !isExecutableStep($newPlan)) throw Error(`Your plan wrapper returned something other than a step... It must return a step (or null). (Returned: ${inspect($newPlan)})`);
          return $newPlan;
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      deleteRepositoryCollaboratorById: {
        plan(_$root, args) {
          const $delete = pgDeleteSingle(resource_repository_collaboratorPgResource, specFromArgs_RepositoryCollaborator2(args));
          args.apply($delete);
          return object({
            result: $delete
          });
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      deleteUser: {
        plan(...planParams) {
          const smartPlan = (...overrideParams) => {
              const args = [...overrideParams.concat(planParams.slice(overrideParams.length))],
                $prev = oldPlan13.apply(this, args);
              if (!($prev instanceof ExecutableStep)) {
                console.error(`Wrapped a plan function at ${"Mutation"}.${"deleteUser"}, but that function did not return a step!
${String(oldPlan13)}`);
                throw Error("Wrapped a plan function, but that function did not return a step!");
              }
              args[1].autoApply($prev);
              return $prev;
            },
            [$source, fieldArgs, info] = planParams,
            $newPlan = planWrapper13(smartPlan, $source, fieldArgs, info);
          if ($newPlan === void 0) throw Error("Your plan wrapper didn't return anything; it must return a step or null!");
          if ($newPlan !== null && !isExecutableStep($newPlan)) throw Error(`Your plan wrapper returned something other than a step... It must return a step (or null). (Returned: ${inspect($newPlan)})`);
          return $newPlan;
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      deleteUserById: {
        plan(_$root, args) {
          const $delete = pgDeleteSingle(resource_userPgResource, specFromArgs_User2(args));
          args.apply($delete);
          return object({
            result: $delete
          });
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      updateOrganization: {
        plan(...planParams) {
          const smartPlan = (...overrideParams) => {
              const args = [...overrideParams.concat(planParams.slice(overrideParams.length))],
                $prev = oldPlan10.apply(this, args);
              if (!($prev instanceof ExecutableStep)) {
                console.error(`Wrapped a plan function at ${"Mutation"}.${"updateOrganization"}, but that function did not return a step!
${String(oldPlan10)}`);
                throw Error("Wrapped a plan function, but that function did not return a step!");
              }
              args[1].autoApply($prev);
              return $prev;
            },
            [$source, fieldArgs, info] = planParams,
            $newPlan = planWrapper10(smartPlan, $source, fieldArgs, info);
          if ($newPlan === void 0) throw Error("Your plan wrapper didn't return anything; it must return a step or null!");
          if ($newPlan !== null && !isExecutableStep($newPlan)) throw Error(`Your plan wrapper returned something other than a step... It must return a step (or null). (Returned: ${inspect($newPlan)})`);
          return $newPlan;
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      updateOrganizationById: {
        plan(_$root, args) {
          const $update = pgUpdateSingle(resource_organizationPgResource, specFromArgs_Organization(args));
          args.apply($update);
          return object({
            result: $update
          });
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      updateOrganizationMember: {
        plan(...planParams) {
          const smartPlan = (...overrideParams) => {
              const args = [...overrideParams.concat(planParams.slice(overrideParams.length))],
                $prev = oldPlan6.apply(this, args);
              if (!($prev instanceof ExecutableStep)) {
                console.error(`Wrapped a plan function at ${"Mutation"}.${"updateOrganizationMember"}, but that function did not return a step!
${String(oldPlan6)}`);
                throw Error("Wrapped a plan function, but that function did not return a step!");
              }
              args[1].autoApply($prev);
              return $prev;
            },
            [$source, fieldArgs, info] = planParams,
            $newPlan = planWrapper6(smartPlan, $source, fieldArgs, info);
          if ($newPlan === void 0) throw Error("Your plan wrapper didn't return anything; it must return a step or null!");
          if ($newPlan !== null && !isExecutableStep($newPlan)) throw Error(`Your plan wrapper returned something other than a step... It must return a step (or null). (Returned: ${inspect($newPlan)})`);
          return $newPlan;
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      updateOrganizationMemberById: {
        plan(_$root, args) {
          const $update = pgUpdateSingle(resource_organization_memberPgResource, specFromArgs_OrganizationMember(args));
          args.apply($update);
          return object({
            result: $update
          });
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      updateRepository: {
        plan(...planParams) {
          const smartPlan = (...overrideParams) => {
              const args = [...overrideParams.concat(planParams.slice(overrideParams.length))],
                $prev = oldPlan9.apply(this, args);
              if (!($prev instanceof ExecutableStep)) {
                console.error(`Wrapped a plan function at ${"Mutation"}.${"updateRepository"}, but that function did not return a step!
${String(oldPlan9)}`);
                throw Error("Wrapped a plan function, but that function did not return a step!");
              }
              args[1].autoApply($prev);
              return $prev;
            },
            [$source, fieldArgs, info] = planParams,
            $newPlan = planWrapper9(smartPlan, $source, fieldArgs, info);
          if ($newPlan === void 0) throw Error("Your plan wrapper didn't return anything; it must return a step or null!");
          if ($newPlan !== null && !isExecutableStep($newPlan)) throw Error(`Your plan wrapper returned something other than a step... It must return a step (or null). (Returned: ${inspect($newPlan)})`);
          return $newPlan;
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      updateRepositoryById: {
        plan(_$root, args) {
          const $update = pgUpdateSingle(resource_repositoryPgResource, specFromArgs_Repository(args));
          args.apply($update);
          return object({
            result: $update
          });
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      updateRepositoryCollaborator: {
        plan(...planParams) {
          const smartPlan = (...overrideParams) => {
              const args = [...overrideParams.concat(planParams.slice(overrideParams.length))],
                $prev = oldPlan7.apply(this, args);
              if (!($prev instanceof ExecutableStep)) {
                console.error(`Wrapped a plan function at ${"Mutation"}.${"updateRepositoryCollaborator"}, but that function did not return a step!
${String(oldPlan7)}`);
                throw Error("Wrapped a plan function, but that function did not return a step!");
              }
              args[1].autoApply($prev);
              return $prev;
            },
            [$source, fieldArgs, info] = planParams,
            $newPlan = planWrapper7(smartPlan, $source, fieldArgs, info);
          if ($newPlan === void 0) throw Error("Your plan wrapper didn't return anything; it must return a step or null!");
          if ($newPlan !== null && !isExecutableStep($newPlan)) throw Error(`Your plan wrapper returned something other than a step... It must return a step (or null). (Returned: ${inspect($newPlan)})`);
          return $newPlan;
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      updateRepositoryCollaboratorById: {
        plan(_$root, args) {
          const $update = pgUpdateSingle(resource_repository_collaboratorPgResource, specFromArgs_RepositoryCollaborator(args));
          args.apply($update);
          return object({
            result: $update
          });
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      updateUser: {
        plan(...planParams) {
          const smartPlan = (...overrideParams) => {
              const args = [...overrideParams.concat(planParams.slice(overrideParams.length))],
                $prev = oldPlan8.apply(this, args);
              if (!($prev instanceof ExecutableStep)) {
                console.error(`Wrapped a plan function at ${"Mutation"}.${"updateUser"}, but that function did not return a step!
${String(oldPlan8)}`);
                throw Error("Wrapped a plan function, but that function did not return a step!");
              }
              args[1].autoApply($prev);
              return $prev;
            },
            [$source, fieldArgs, info] = planParams,
            $newPlan = planWrapper8(smartPlan, $source, fieldArgs, info);
          if ($newPlan === void 0) throw Error("Your plan wrapper didn't return anything; it must return a step or null!");
          if ($newPlan !== null && !isExecutableStep($newPlan)) throw Error(`Your plan wrapper returned something other than a step... It must return a step (or null). (Returned: ${inspect($newPlan)})`);
          return $newPlan;
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      updateUserById: {
        plan(_$root, args) {
          const $update = pgUpdateSingle(resource_userPgResource, specFromArgs_User(args));
          args.apply($update);
          return object({
            result: $update
          });
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      }
    }
  },
  CreateOrganizationMemberPayload: {
    assertStep: assertExecutableStep,
    plans: {
      clientMutationId($mutation) {
        return $mutation.getStepForKey("result").getMeta("clientMutationId");
      },
      organizationMember($object) {
        return $object.get("result");
      },
      organizationMemberEdge($mutation, fieldArgs) {
        return pgMutationPayloadEdge(resource_organization_memberPgResource, organization_memberUniques[0].attributes, $mutation, fieldArgs);
      },
      query() {
        return rootValue();
      }
    }
  },
  CreateOrganizationPayload: {
    assertStep: assertExecutableStep,
    plans: {
      clientMutationId($mutation) {
        return $mutation.getStepForKey("result").getMeta("clientMutationId");
      },
      organization($object) {
        return $object.get("result");
      },
      organizationEdge($mutation, fieldArgs) {
        return pgMutationPayloadEdge(resource_organizationPgResource, organizationUniques[0].attributes, $mutation, fieldArgs);
      },
      query() {
        return rootValue();
      }
    }
  },
  CreateRepositoryCollaboratorPayload: {
    assertStep: assertExecutableStep,
    plans: {
      clientMutationId($mutation) {
        return $mutation.getStepForKey("result").getMeta("clientMutationId");
      },
      query() {
        return rootValue();
      },
      repositoryCollaborator($object) {
        return $object.get("result");
      },
      repositoryCollaboratorEdge($mutation, fieldArgs) {
        return pgMutationPayloadEdge(resource_repository_collaboratorPgResource, repository_collaboratorUniques[0].attributes, $mutation, fieldArgs);
      }
    }
  },
  CreateRepositoryPayload: {
    assertStep: assertExecutableStep,
    plans: {
      clientMutationId($mutation) {
        return $mutation.getStepForKey("result").getMeta("clientMutationId");
      },
      query() {
        return rootValue();
      },
      repository($object) {
        return $object.get("result");
      },
      repositoryEdge($mutation, fieldArgs) {
        return pgMutationPayloadEdge(resource_repositoryPgResource, repositoryUniques[0].attributes, $mutation, fieldArgs);
      }
    }
  },
  CreateUserPayload: {
    assertStep: assertExecutableStep,
    plans: {
      clientMutationId($mutation) {
        return $mutation.getStepForKey("result").getMeta("clientMutationId");
      },
      query() {
        return rootValue();
      },
      user($object) {
        return $object.get("result");
      },
      userEdge($mutation, fieldArgs) {
        return pgMutationPayloadEdge(resource_userPgResource, userUniques[0].attributes, $mutation, fieldArgs);
      }
    }
  },
  DeleteOrganizationMemberPayload: {
    assertStep: ObjectStep,
    plans: {
      clientMutationId($mutation) {
        return $mutation.getStepForKey("result").getMeta("clientMutationId");
      },
      deletedOrganizationMemberId($object) {
        const $record = $object.getStepForKey("result"),
          specifier = nodeIdHandler_OrganizationMember.plan($record);
        return lambda(specifier, nodeIdCodecs_base64JSON_base64JSON.encode);
      },
      organizationMember($object) {
        return $object.get("result");
      },
      organizationMemberEdge($mutation, fieldArgs) {
        return pgMutationPayloadEdge(resource_organization_memberPgResource, organization_memberUniques[0].attributes, $mutation, fieldArgs);
      },
      query() {
        return rootValue();
      }
    }
  },
  DeleteOrganizationPayload: {
    assertStep: ObjectStep,
    plans: {
      clientMutationId($mutation) {
        return $mutation.getStepForKey("result").getMeta("clientMutationId");
      },
      deletedOrganizationId($object) {
        const $record = $object.getStepForKey("result"),
          specifier = nodeIdHandler_Organization.plan($record);
        return lambda(specifier, nodeIdCodecs_base64JSON_base64JSON.encode);
      },
      organization($object) {
        return $object.get("result");
      },
      organizationEdge($mutation, fieldArgs) {
        return pgMutationPayloadEdge(resource_organizationPgResource, organizationUniques[0].attributes, $mutation, fieldArgs);
      },
      query() {
        return rootValue();
      }
    }
  },
  DeleteRepositoryCollaboratorPayload: {
    assertStep: ObjectStep,
    plans: {
      clientMutationId($mutation) {
        return $mutation.getStepForKey("result").getMeta("clientMutationId");
      },
      deletedRepositoryCollaboratorId($object) {
        const $record = $object.getStepForKey("result"),
          specifier = nodeIdHandler_RepositoryCollaborator.plan($record);
        return lambda(specifier, nodeIdCodecs_base64JSON_base64JSON.encode);
      },
      query() {
        return rootValue();
      },
      repositoryCollaborator($object) {
        return $object.get("result");
      },
      repositoryCollaboratorEdge($mutation, fieldArgs) {
        return pgMutationPayloadEdge(resource_repository_collaboratorPgResource, repository_collaboratorUniques[0].attributes, $mutation, fieldArgs);
      }
    }
  },
  DeleteRepositoryPayload: {
    assertStep: ObjectStep,
    plans: {
      clientMutationId($mutation) {
        return $mutation.getStepForKey("result").getMeta("clientMutationId");
      },
      deletedRepositoryId($object) {
        const $record = $object.getStepForKey("result"),
          specifier = nodeIdHandler_Repository.plan($record);
        return lambda(specifier, nodeIdCodecs_base64JSON_base64JSON.encode);
      },
      query() {
        return rootValue();
      },
      repository($object) {
        return $object.get("result");
      },
      repositoryEdge($mutation, fieldArgs) {
        return pgMutationPayloadEdge(resource_repositoryPgResource, repositoryUniques[0].attributes, $mutation, fieldArgs);
      }
    }
  },
  DeleteUserPayload: {
    assertStep: ObjectStep,
    plans: {
      clientMutationId($mutation) {
        return $mutation.getStepForKey("result").getMeta("clientMutationId");
      },
      deletedUserId($object) {
        const $record = $object.getStepForKey("result"),
          specifier = nodeIdHandler_User.plan($record);
        return lambda(specifier, nodeIdCodecs_base64JSON_base64JSON.encode);
      },
      query() {
        return rootValue();
      },
      user($object) {
        return $object.get("result");
      },
      userEdge($mutation, fieldArgs) {
        return pgMutationPayloadEdge(resource_userPgResource, userUniques[0].attributes, $mutation, fieldArgs);
      }
    }
  },
  Organization: {
    assertStep: assertPgClassSingleStep,
    plans: {
      avatarUrl($record) {
        return $record.get("avatar_url");
      },
      createdAt($record) {
        return $record.get("created_at");
      },
      id($parent) {
        const specifier = nodeIdHandler_Organization.plan($parent);
        return lambda(specifier, nodeIdCodecs[nodeIdHandler_Organization.codec.name].encode);
      },
      organizationMembers: {
        plan($record) {
          const $records = resource_organization_memberPgResource.find({
            organization_id: $record.get("id")
          });
          return connection($records);
        },
        args: {
          first(_, $connection, arg) {
            $connection.setFirst(arg.getRaw());
          },
          last(_, $connection, val) {
            $connection.setLast(val.getRaw());
          },
          offset(_, $connection, val) {
            $connection.setOffset(val.getRaw());
          },
          before(_, $connection, val) {
            $connection.setBefore(val.getRaw());
          },
          after(_, $connection, val) {
            $connection.setAfter(val.getRaw());
          },
          condition(_condition, $connection, arg) {
            const $select = $connection.getSubplan();
            arg.apply($select, qbWhereBuilder);
          },
          filter(_, $connection, fieldArg) {
            const $pgSelect = $connection.getSubplan();
            fieldArg.apply($pgSelect, (queryBuilder, value) => {
              assertAllowed6(value, "object");
              if (value == null) return;
              const condition = new PgCondition(queryBuilder);
              return condition;
            });
          },
          orderBy(parent, $connection, value) {
            const $select = $connection.getSubplan();
            value.apply($select);
          }
        }
      },
      repositories: {
        plan($record) {
          const $records = resource_repositoryPgResource.find({
            organization_id: $record.get("id")
          });
          return connection($records);
        },
        args: {
          first(_, $connection, arg) {
            $connection.setFirst(arg.getRaw());
          },
          last(_, $connection, val) {
            $connection.setLast(val.getRaw());
          },
          offset(_, $connection, val) {
            $connection.setOffset(val.getRaw());
          },
          before(_, $connection, val) {
            $connection.setBefore(val.getRaw());
          },
          after(_, $connection, val) {
            $connection.setAfter(val.getRaw());
          },
          condition(_condition, $connection, arg) {
            const $select = $connection.getSubplan();
            arg.apply($select, qbWhereBuilder);
          },
          filter(_, $connection, fieldArg) {
            const $pgSelect = $connection.getSubplan();
            fieldArg.apply($pgSelect, (queryBuilder, value) => {
              assertAllowed7(value, "object");
              if (value == null) return;
              const condition = new PgCondition(queryBuilder);
              return condition;
            });
          },
          orderBy(parent, $connection, value) {
            const $select = $connection.getSubplan();
            value.apply($select);
          }
        }
      },
      rowId($record) {
        return $record.get("id");
      },
      stripeCustomerId($record) {
        return $record.get("stripe_customer_id");
      },
      stripeSubscriptionId($record) {
        return $record.get("stripe_subscription_id");
      },
      updatedAt($record) {
        return $record.get("updated_at");
      }
    },
    planType($specifier) {
      const spec = Object.create(null);
      for (const pkCol of organizationUniques[0].attributes) spec[pkCol] = get2($specifier, pkCol);
      return resource_organizationPgResource.get(spec);
    }
  },
  OrganizationAggregates: {
    assertStep: assertPgClassSingleStep,
    plans: {
      distinctCount($pgSelectSingle) {
        return $pgSelectSingle;
      },
      keys($pgSelectSingle) {
        const $groupDetails = $pgSelectSingle.getClassStep().getGroupDetails();
        return lambda([$groupDetails, $pgSelectSingle], ([groupDetails, item]) => {
          if (groupDetails.indicies.length === 0 || item == null) return null;else return groupDetails.indicies.map(({
            index
          }) => item[index]);
        });
      }
    }
  },
  OrganizationConnection: {
    assertStep: ConnectionStep,
    plans: {
      aggregates($connection) {
        return $connection.cloneSubplanWithoutPagination("aggregate").single();
      },
      groupedAggregates: {
        plan($connection) {
          return $connection.cloneSubplanWithoutPagination("aggregate");
        },
        args: {
          groupBy(_$parent, $pgSelect, input) {
            return input.apply($pgSelect);
          },
          having(_$parent, $pgSelect, input) {
            return input.apply($pgSelect, queryBuilder => queryBuilder.havingBuilder());
          }
        }
      },
      totalCount($connection) {
        return $connection.cloneSubplanWithoutPagination("aggregate").singleAsRecord().select(sql`count(*)`, TYPES.bigint, !1);
      }
    }
  },
  OrganizationDistinctCountAggregates: {
    plans: {
      avatarUrl($pgSelectSingle) {
        const sqlAttribute = sql.fragment`${$pgSelectSingle.getClassStep().alias}.${sql.identifier("avatar_url")}`,
          sqlAggregate = spec.sqlAggregateWrap(sqlAttribute, TYPES.text);
        return $pgSelectSingle.select(sqlAggregate, TYPES.bigint);
      },
      createdAt($pgSelectSingle) {
        const sqlAttribute = sql.fragment`${$pgSelectSingle.getClassStep().alias}.${sql.identifier("created_at")}`,
          sqlAggregate = spec.sqlAggregateWrap(sqlAttribute, TYPES.timestamptz);
        return $pgSelectSingle.select(sqlAggregate, TYPES.bigint);
      },
      description($pgSelectSingle) {
        const sqlAttribute = sql.fragment`${$pgSelectSingle.getClassStep().alias}.${sql.identifier("description")}`,
          sqlAggregate = spec.sqlAggregateWrap(sqlAttribute, TYPES.text);
        return $pgSelectSingle.select(sqlAggregate, TYPES.bigint);
      },
      name($pgSelectSingle) {
        const sqlAttribute = sql.fragment`${$pgSelectSingle.getClassStep().alias}.${sql.identifier("name")}`,
          sqlAggregate = spec.sqlAggregateWrap(sqlAttribute, TYPES.text);
        return $pgSelectSingle.select(sqlAggregate, TYPES.bigint);
      },
      rowId($pgSelectSingle) {
        const sqlAttribute = sql.fragment`${$pgSelectSingle.getClassStep().alias}.${sql.identifier("id")}`,
          sqlAggregate = spec.sqlAggregateWrap(sqlAttribute, TYPES.uuid);
        return $pgSelectSingle.select(sqlAggregate, TYPES.bigint);
      },
      slug($pgSelectSingle) {
        const sqlAttribute = sql.fragment`${$pgSelectSingle.getClassStep().alias}.${sql.identifier("slug")}`,
          sqlAggregate = spec.sqlAggregateWrap(sqlAttribute, TYPES.text);
        return $pgSelectSingle.select(sqlAggregate, TYPES.bigint);
      },
      stripeCustomerId($pgSelectSingle) {
        const sqlAttribute = sql.fragment`${$pgSelectSingle.getClassStep().alias}.${sql.identifier("stripe_customer_id")}`,
          sqlAggregate = spec.sqlAggregateWrap(sqlAttribute, TYPES.text);
        return $pgSelectSingle.select(sqlAggregate, TYPES.bigint);
      },
      stripeSubscriptionId($pgSelectSingle) {
        const sqlAttribute = sql.fragment`${$pgSelectSingle.getClassStep().alias}.${sql.identifier("stripe_subscription_id")}`,
          sqlAggregate = spec.sqlAggregateWrap(sqlAttribute, TYPES.text);
        return $pgSelectSingle.select(sqlAggregate, TYPES.bigint);
      },
      tier($pgSelectSingle) {
        const sqlAttribute = sql.fragment`${$pgSelectSingle.getClassStep().alias}.${sql.identifier("tier")}`,
          sqlAggregate = spec.sqlAggregateWrap(sqlAttribute, tierCodec);
        return $pgSelectSingle.select(sqlAggregate, TYPES.bigint);
      },
      updatedAt($pgSelectSingle) {
        const sqlAttribute = sql.fragment`${$pgSelectSingle.getClassStep().alias}.${sql.identifier("updated_at")}`,
          sqlAggregate = spec.sqlAggregateWrap(sqlAttribute, TYPES.timestamptz);
        return $pgSelectSingle.select(sqlAggregate, TYPES.bigint);
      }
    }
  },
  OrganizationMember: {
    assertStep: assertPgClassSingleStep,
    plans: {
      createdAt($record) {
        return $record.get("created_at");
      },
      id($parent) {
        const specifier = nodeIdHandler_OrganizationMember.plan($parent);
        return lambda(specifier, nodeIdCodecs[nodeIdHandler_OrganizationMember.codec.name].encode);
      },
      organization($record) {
        return resource_organizationPgResource.get({
          id: $record.get("organization_id")
        });
      },
      organizationId($record) {
        return $record.get("organization_id");
      },
      updatedAt($record) {
        return $record.get("updated_at");
      },
      user($record) {
        return resource_userPgResource.get({
          id: $record.get("user_id")
        });
      },
      userId($record) {
        return $record.get("user_id");
      }
    },
    planType($specifier) {
      const spec = Object.create(null);
      for (const pkCol of organization_memberUniques[0].attributes) spec[pkCol] = get2($specifier, pkCol);
      return resource_organization_memberPgResource.get(spec);
    }
  },
  OrganizationMemberAggregates: {
    assertStep: assertPgClassSingleStep,
    plans: {
      distinctCount($pgSelectSingle) {
        return $pgSelectSingle;
      },
      keys($pgSelectSingle) {
        const $groupDetails = $pgSelectSingle.getClassStep().getGroupDetails();
        return lambda([$groupDetails, $pgSelectSingle], ([groupDetails, item]) => {
          if (groupDetails.indicies.length === 0 || item == null) return null;else return groupDetails.indicies.map(({
            index
          }) => item[index]);
        });
      }
    }
  },
  OrganizationMemberConnection: {
    assertStep: ConnectionStep,
    plans: {
      aggregates($connection) {
        return $connection.cloneSubplanWithoutPagination("aggregate").single();
      },
      groupedAggregates: {
        plan($connection) {
          return $connection.cloneSubplanWithoutPagination("aggregate");
        },
        args: {
          groupBy(_$parent, $pgSelect, input) {
            return input.apply($pgSelect);
          },
          having(_$parent, $pgSelect, input) {
            return input.apply($pgSelect, queryBuilder => queryBuilder.havingBuilder());
          }
        }
      },
      totalCount($connection) {
        return $connection.cloneSubplanWithoutPagination("aggregate").singleAsRecord().select(sql`count(*)`, TYPES.bigint, !1);
      }
    }
  },
  OrganizationMemberDistinctCountAggregates: {
    plans: {
      createdAt($pgSelectSingle) {
        const sqlAttribute = sql.fragment`${$pgSelectSingle.getClassStep().alias}.${sql.identifier("created_at")}`,
          sqlAggregate = spec.sqlAggregateWrap(sqlAttribute, TYPES.timestamptz);
        return $pgSelectSingle.select(sqlAggregate, TYPES.bigint);
      },
      organizationId($pgSelectSingle) {
        const sqlAttribute = sql.fragment`${$pgSelectSingle.getClassStep().alias}.${sql.identifier("organization_id")}`,
          sqlAggregate = spec.sqlAggregateWrap(sqlAttribute, TYPES.uuid);
        return $pgSelectSingle.select(sqlAggregate, TYPES.bigint);
      },
      role($pgSelectSingle) {
        const sqlAttribute = sql.fragment`${$pgSelectSingle.getClassStep().alias}.${sql.identifier("role")}`,
          sqlAggregate = spec.sqlAggregateWrap(sqlAttribute, roleCodec);
        return $pgSelectSingle.select(sqlAggregate, TYPES.bigint);
      },
      updatedAt($pgSelectSingle) {
        const sqlAttribute = sql.fragment`${$pgSelectSingle.getClassStep().alias}.${sql.identifier("updated_at")}`,
          sqlAggregate = spec.sqlAggregateWrap(sqlAttribute, TYPES.timestamptz);
        return $pgSelectSingle.select(sqlAggregate, TYPES.bigint);
      },
      userId($pgSelectSingle) {
        const sqlAttribute = sql.fragment`${$pgSelectSingle.getClassStep().alias}.${sql.identifier("user_id")}`,
          sqlAggregate = spec.sqlAggregateWrap(sqlAttribute, TYPES.uuid);
        return $pgSelectSingle.select(sqlAggregate, TYPES.bigint);
      }
    }
  },
  Repository: {
    assertStep: assertPgClassSingleStep,
    plans: {
      createdAt($record) {
        return $record.get("created_at");
      },
      defaultBranch($record) {
        return $record.get("default_branch");
      },
      id($parent) {
        const specifier = nodeIdHandler_Repository.plan($parent);
        return lambda(specifier, nodeIdCodecs[nodeIdHandler_Repository.codec.name].encode);
      },
      organization($record) {
        return resource_organizationPgResource.get({
          id: $record.get("organization_id")
        });
      },
      organizationId($record) {
        return $record.get("organization_id");
      },
      owner($record) {
        return resource_userPgResource.get({
          id: $record.get("owner_id")
        });
      },
      ownerId($record) {
        return $record.get("owner_id");
      },
      repositoryCollaborators: {
        plan($record) {
          const $records = resource_repository_collaboratorPgResource.find({
            repository_id: $record.get("id")
          });
          return connection($records);
        },
        args: {
          first(_, $connection, arg) {
            $connection.setFirst(arg.getRaw());
          },
          last(_, $connection, val) {
            $connection.setLast(val.getRaw());
          },
          offset(_, $connection, val) {
            $connection.setOffset(val.getRaw());
          },
          before(_, $connection, val) {
            $connection.setBefore(val.getRaw());
          },
          after(_, $connection, val) {
            $connection.setAfter(val.getRaw());
          },
          condition(_condition, $connection, arg) {
            const $select = $connection.getSubplan();
            arg.apply($select, qbWhereBuilder);
          },
          filter(_, $connection, fieldArg) {
            const $pgSelect = $connection.getSubplan();
            fieldArg.apply($pgSelect, (queryBuilder, value) => {
              assertAllowed25(value, "object");
              if (value == null) return;
              const condition = new PgCondition(queryBuilder);
              return condition;
            });
          },
          orderBy(parent, $connection, value) {
            const $select = $connection.getSubplan();
            value.apply($select);
          }
        }
      },
      rowId($record) {
        return $record.get("id");
      },
      updatedAt($record) {
        return $record.get("updated_at");
      }
    },
    planType($specifier) {
      const spec = Object.create(null);
      for (const pkCol of repositoryUniques[0].attributes) spec[pkCol] = get2($specifier, pkCol);
      return resource_repositoryPgResource.get(spec);
    }
  },
  RepositoryAggregates: {
    assertStep: assertPgClassSingleStep,
    plans: {
      distinctCount($pgSelectSingle) {
        return $pgSelectSingle;
      },
      keys($pgSelectSingle) {
        const $groupDetails = $pgSelectSingle.getClassStep().getGroupDetails();
        return lambda([$groupDetails, $pgSelectSingle], ([groupDetails, item]) => {
          if (groupDetails.indicies.length === 0 || item == null) return null;else return groupDetails.indicies.map(({
            index
          }) => item[index]);
        });
      }
    }
  },
  RepositoryCollaborator: {
    assertStep: assertPgClassSingleStep,
    plans: {
      createdAt($record) {
        return $record.get("created_at");
      },
      id($parent) {
        const specifier = nodeIdHandler_RepositoryCollaborator.plan($parent);
        return lambda(specifier, nodeIdCodecs[nodeIdHandler_RepositoryCollaborator.codec.name].encode);
      },
      repository($record) {
        return resource_repositoryPgResource.get({
          id: $record.get("repository_id")
        });
      },
      repositoryId($record) {
        return $record.get("repository_id");
      },
      updatedAt($record) {
        return $record.get("updated_at");
      },
      user($record) {
        return resource_userPgResource.get({
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
      return resource_repository_collaboratorPgResource.get(spec);
    }
  },
  RepositoryCollaboratorAggregates: {
    assertStep: assertPgClassSingleStep,
    plans: {
      distinctCount($pgSelectSingle) {
        return $pgSelectSingle;
      },
      keys($pgSelectSingle) {
        const $groupDetails = $pgSelectSingle.getClassStep().getGroupDetails();
        return lambda([$groupDetails, $pgSelectSingle], ([groupDetails, item]) => {
          if (groupDetails.indicies.length === 0 || item == null) return null;else return groupDetails.indicies.map(({
            index
          }) => item[index]);
        });
      }
    }
  },
  RepositoryCollaboratorConnection: {
    assertStep: ConnectionStep,
    plans: {
      aggregates($connection) {
        return $connection.cloneSubplanWithoutPagination("aggregate").single();
      },
      groupedAggregates: {
        plan($connection) {
          return $connection.cloneSubplanWithoutPagination("aggregate");
        },
        args: {
          groupBy(_$parent, $pgSelect, input) {
            return input.apply($pgSelect);
          },
          having(_$parent, $pgSelect, input) {
            return input.apply($pgSelect, queryBuilder => queryBuilder.havingBuilder());
          }
        }
      },
      totalCount($connection) {
        return $connection.cloneSubplanWithoutPagination("aggregate").singleAsRecord().select(sql`count(*)`, TYPES.bigint, !1);
      }
    }
  },
  RepositoryCollaboratorDistinctCountAggregates: {
    plans: {
      createdAt($pgSelectSingle) {
        const sqlAttribute = sql.fragment`${$pgSelectSingle.getClassStep().alias}.${sql.identifier("created_at")}`,
          sqlAggregate = spec.sqlAggregateWrap(sqlAttribute, TYPES.timestamptz);
        return $pgSelectSingle.select(sqlAggregate, TYPES.bigint);
      },
      permission($pgSelectSingle) {
        const sqlAttribute = sql.fragment`${$pgSelectSingle.getClassStep().alias}.${sql.identifier("permission")}`,
          sqlAggregate = spec.sqlAggregateWrap(sqlAttribute, permissionCodec);
        return $pgSelectSingle.select(sqlAggregate, TYPES.bigint);
      },
      repositoryId($pgSelectSingle) {
        const sqlAttribute = sql.fragment`${$pgSelectSingle.getClassStep().alias}.${sql.identifier("repository_id")}`,
          sqlAggregate = spec.sqlAggregateWrap(sqlAttribute, TYPES.uuid);
        return $pgSelectSingle.select(sqlAggregate, TYPES.bigint);
      },
      updatedAt($pgSelectSingle) {
        const sqlAttribute = sql.fragment`${$pgSelectSingle.getClassStep().alias}.${sql.identifier("updated_at")}`,
          sqlAggregate = spec.sqlAggregateWrap(sqlAttribute, TYPES.timestamptz);
        return $pgSelectSingle.select(sqlAggregate, TYPES.bigint);
      },
      userId($pgSelectSingle) {
        const sqlAttribute = sql.fragment`${$pgSelectSingle.getClassStep().alias}.${sql.identifier("user_id")}`,
          sqlAggregate = spec.sqlAggregateWrap(sqlAttribute, TYPES.uuid);
        return $pgSelectSingle.select(sqlAggregate, TYPES.bigint);
      }
    }
  },
  RepositoryConnection: {
    assertStep: ConnectionStep,
    plans: {
      aggregates($connection) {
        return $connection.cloneSubplanWithoutPagination("aggregate").single();
      },
      groupedAggregates: {
        plan($connection) {
          return $connection.cloneSubplanWithoutPagination("aggregate");
        },
        args: {
          groupBy(_$parent, $pgSelect, input) {
            return input.apply($pgSelect);
          },
          having(_$parent, $pgSelect, input) {
            return input.apply($pgSelect, queryBuilder => queryBuilder.havingBuilder());
          }
        }
      },
      totalCount($connection) {
        return $connection.cloneSubplanWithoutPagination("aggregate").singleAsRecord().select(sql`count(*)`, TYPES.bigint, !1);
      }
    }
  },
  RepositoryDistinctCountAggregates: {
    plans: {
      createdAt($pgSelectSingle) {
        const sqlAttribute = sql.fragment`${$pgSelectSingle.getClassStep().alias}.${sql.identifier("created_at")}`,
          sqlAggregate = spec.sqlAggregateWrap(sqlAttribute, TYPES.timestamptz);
        return $pgSelectSingle.select(sqlAggregate, TYPES.bigint);
      },
      defaultBranch($pgSelectSingle) {
        const sqlAttribute = sql.fragment`${$pgSelectSingle.getClassStep().alias}.${sql.identifier("default_branch")}`,
          sqlAggregate = spec.sqlAggregateWrap(sqlAttribute, TYPES.text);
        return $pgSelectSingle.select(sqlAggregate, TYPES.bigint);
      },
      description($pgSelectSingle) {
        const sqlAttribute = sql.fragment`${$pgSelectSingle.getClassStep().alias}.${sql.identifier("description")}`,
          sqlAggregate = spec.sqlAggregateWrap(sqlAttribute, TYPES.text);
        return $pgSelectSingle.select(sqlAggregate, TYPES.bigint);
      },
      name($pgSelectSingle) {
        const sqlAttribute = sql.fragment`${$pgSelectSingle.getClassStep().alias}.${sql.identifier("name")}`,
          sqlAggregate = spec.sqlAggregateWrap(sqlAttribute, TYPES.text);
        return $pgSelectSingle.select(sqlAggregate, TYPES.bigint);
      },
      organizationId($pgSelectSingle) {
        const sqlAttribute = sql.fragment`${$pgSelectSingle.getClassStep().alias}.${sql.identifier("organization_id")}`,
          sqlAggregate = spec.sqlAggregateWrap(sqlAttribute, TYPES.uuid);
        return $pgSelectSingle.select(sqlAggregate, TYPES.bigint);
      },
      ownerId($pgSelectSingle) {
        const sqlAttribute = sql.fragment`${$pgSelectSingle.getClassStep().alias}.${sql.identifier("owner_id")}`,
          sqlAggregate = spec.sqlAggregateWrap(sqlAttribute, TYPES.uuid);
        return $pgSelectSingle.select(sqlAggregate, TYPES.bigint);
      },
      rowId($pgSelectSingle) {
        const sqlAttribute = sql.fragment`${$pgSelectSingle.getClassStep().alias}.${sql.identifier("id")}`,
          sqlAggregate = spec.sqlAggregateWrap(sqlAttribute, TYPES.uuid);
        return $pgSelectSingle.select(sqlAggregate, TYPES.bigint);
      },
      slug($pgSelectSingle) {
        const sqlAttribute = sql.fragment`${$pgSelectSingle.getClassStep().alias}.${sql.identifier("slug")}`,
          sqlAggregate = spec.sqlAggregateWrap(sqlAttribute, TYPES.text);
        return $pgSelectSingle.select(sqlAggregate, TYPES.bigint);
      },
      updatedAt($pgSelectSingle) {
        const sqlAttribute = sql.fragment`${$pgSelectSingle.getClassStep().alias}.${sql.identifier("updated_at")}`,
          sqlAggregate = spec.sqlAggregateWrap(sqlAttribute, TYPES.timestamptz);
        return $pgSelectSingle.select(sqlAggregate, TYPES.bigint);
      },
      visibility($pgSelectSingle) {
        const sqlAttribute = sql.fragment`${$pgSelectSingle.getClassStep().alias}.${sql.identifier("visibility")}`,
          sqlAggregate = spec.sqlAggregateWrap(sqlAttribute, visibilityCodec);
        return $pgSelectSingle.select(sqlAggregate, TYPES.bigint);
      }
    }
  },
  UpdateOrganizationMemberPayload: {
    assertStep: ObjectStep,
    plans: {
      clientMutationId($mutation) {
        return $mutation.getStepForKey("result").getMeta("clientMutationId");
      },
      organizationMember($object) {
        return $object.get("result");
      },
      organizationMemberEdge($mutation, fieldArgs) {
        return pgMutationPayloadEdge(resource_organization_memberPgResource, organization_memberUniques[0].attributes, $mutation, fieldArgs);
      },
      query() {
        return rootValue();
      }
    }
  },
  UpdateOrganizationPayload: {
    assertStep: ObjectStep,
    plans: {
      clientMutationId($mutation) {
        return $mutation.getStepForKey("result").getMeta("clientMutationId");
      },
      organization($object) {
        return $object.get("result");
      },
      organizationEdge($mutation, fieldArgs) {
        return pgMutationPayloadEdge(resource_organizationPgResource, organizationUniques[0].attributes, $mutation, fieldArgs);
      },
      query() {
        return rootValue();
      }
    }
  },
  UpdateRepositoryCollaboratorPayload: {
    assertStep: ObjectStep,
    plans: {
      clientMutationId($mutation) {
        return $mutation.getStepForKey("result").getMeta("clientMutationId");
      },
      query() {
        return rootValue();
      },
      repositoryCollaborator($object) {
        return $object.get("result");
      },
      repositoryCollaboratorEdge($mutation, fieldArgs) {
        return pgMutationPayloadEdge(resource_repository_collaboratorPgResource, repository_collaboratorUniques[0].attributes, $mutation, fieldArgs);
      }
    }
  },
  UpdateRepositoryPayload: {
    assertStep: ObjectStep,
    plans: {
      clientMutationId($mutation) {
        return $mutation.getStepForKey("result").getMeta("clientMutationId");
      },
      query() {
        return rootValue();
      },
      repository($object) {
        return $object.get("result");
      },
      repositoryEdge($mutation, fieldArgs) {
        return pgMutationPayloadEdge(resource_repositoryPgResource, repositoryUniques[0].attributes, $mutation, fieldArgs);
      }
    }
  },
  UpdateUserPayload: {
    assertStep: ObjectStep,
    plans: {
      clientMutationId($mutation) {
        return $mutation.getStepForKey("result").getMeta("clientMutationId");
      },
      query() {
        return rootValue();
      },
      user($object) {
        return $object.get("result");
      },
      userEdge($mutation, fieldArgs) {
        return pgMutationPayloadEdge(resource_userPgResource, userUniques[0].attributes, $mutation, fieldArgs);
      }
    }
  },
  User: {
    assertStep: assertPgClassSingleStep,
    plans: {
      avatarUrl($record) {
        return $record.get("avatar_url");
      },
      createdAt($record) {
        return $record.get("created_at");
      },
      id($parent) {
        const specifier = nodeIdHandler_User.plan($parent);
        return lambda(specifier, nodeIdCodecs[nodeIdHandler_User.codec.name].encode);
      },
      identityProviderId($record) {
        return $record.get("identity_provider_id");
      },
      organizationMembers: {
        plan($record) {
          const $records = resource_organization_memberPgResource.find({
            user_id: $record.get("id")
          });
          return connection($records);
        },
        args: {
          first(_, $connection, arg) {
            $connection.setFirst(arg.getRaw());
          },
          last(_, $connection, val) {
            $connection.setLast(val.getRaw());
          },
          offset(_, $connection, val) {
            $connection.setOffset(val.getRaw());
          },
          before(_, $connection, val) {
            $connection.setBefore(val.getRaw());
          },
          after(_, $connection, val) {
            $connection.setAfter(val.getRaw());
          },
          condition(_condition, $connection, arg) {
            const $select = $connection.getSubplan();
            arg.apply($select, qbWhereBuilder);
          },
          filter(_, $connection, fieldArg) {
            const $pgSelect = $connection.getSubplan();
            fieldArg.apply($pgSelect, (queryBuilder, value) => {
              assertAllowed26(value, "object");
              if (value == null) return;
              const condition = new PgCondition(queryBuilder);
              return condition;
            });
          },
          orderBy(parent, $connection, value) {
            const $select = $connection.getSubplan();
            value.apply($select);
          }
        }
      },
      repositoriesByOwnerId: {
        plan($record) {
          const $records = resource_repositoryPgResource.find({
            owner_id: $record.get("id")
          });
          return connection($records);
        },
        args: {
          first(_, $connection, arg) {
            $connection.setFirst(arg.getRaw());
          },
          last(_, $connection, val) {
            $connection.setLast(val.getRaw());
          },
          offset(_, $connection, val) {
            $connection.setOffset(val.getRaw());
          },
          before(_, $connection, val) {
            $connection.setBefore(val.getRaw());
          },
          after(_, $connection, val) {
            $connection.setAfter(val.getRaw());
          },
          condition(_condition, $connection, arg) {
            const $select = $connection.getSubplan();
            arg.apply($select, qbWhereBuilder);
          },
          filter(_, $connection, fieldArg) {
            const $pgSelect = $connection.getSubplan();
            fieldArg.apply($pgSelect, (queryBuilder, value) => {
              assertAllowed27(value, "object");
              if (value == null) return;
              const condition = new PgCondition(queryBuilder);
              return condition;
            });
          },
          orderBy(parent, $connection, value) {
            const $select = $connection.getSubplan();
            value.apply($select);
          }
        }
      },
      repositoryCollaborators: {
        plan($record) {
          const $records = resource_repository_collaboratorPgResource.find({
            user_id: $record.get("id")
          });
          return connection($records);
        },
        args: {
          first(_, $connection, arg) {
            $connection.setFirst(arg.getRaw());
          },
          last(_, $connection, val) {
            $connection.setLast(val.getRaw());
          },
          offset(_, $connection, val) {
            $connection.setOffset(val.getRaw());
          },
          before(_, $connection, val) {
            $connection.setBefore(val.getRaw());
          },
          after(_, $connection, val) {
            $connection.setAfter(val.getRaw());
          },
          condition(_condition, $connection, arg) {
            const $select = $connection.getSubplan();
            arg.apply($select, qbWhereBuilder);
          },
          filter(_, $connection, fieldArg) {
            const $pgSelect = $connection.getSubplan();
            fieldArg.apply($pgSelect, (queryBuilder, value) => {
              assertAllowed28(value, "object");
              if (value == null) return;
              const condition = new PgCondition(queryBuilder);
              return condition;
            });
          },
          orderBy(parent, $connection, value) {
            const $select = $connection.getSubplan();
            value.apply($select);
          }
        }
      },
      rowId($record) {
        return $record.get("id");
      },
      updatedAt($record) {
        return $record.get("updated_at");
      }
    },
    planType($specifier) {
      const spec = Object.create(null);
      for (const pkCol of userUniques[0].attributes) spec[pkCol] = get2($specifier, pkCol);
      return resource_userPgResource.get(spec);
    }
  },
  UserAggregates: {
    assertStep: assertPgClassSingleStep,
    plans: {
      distinctCount($pgSelectSingle) {
        return $pgSelectSingle;
      },
      keys($pgSelectSingle) {
        const $groupDetails = $pgSelectSingle.getClassStep().getGroupDetails();
        return lambda([$groupDetails, $pgSelectSingle], ([groupDetails, item]) => {
          if (groupDetails.indicies.length === 0 || item == null) return null;else return groupDetails.indicies.map(({
            index
          }) => item[index]);
        });
      }
    }
  },
  UserConnection: {
    assertStep: ConnectionStep,
    plans: {
      aggregates($connection) {
        return $connection.cloneSubplanWithoutPagination("aggregate").single();
      },
      groupedAggregates: {
        plan($connection) {
          return $connection.cloneSubplanWithoutPagination("aggregate");
        },
        args: {
          groupBy(_$parent, $pgSelect, input) {
            return input.apply($pgSelect);
          },
          having(_$parent, $pgSelect, input) {
            return input.apply($pgSelect, queryBuilder => queryBuilder.havingBuilder());
          }
        }
      },
      totalCount($connection) {
        return $connection.cloneSubplanWithoutPagination("aggregate").singleAsRecord().select(sql`count(*)`, TYPES.bigint, !1);
      }
    }
  },
  UserDistinctCountAggregates: {
    plans: {
      avatarUrl($pgSelectSingle) {
        const sqlAttribute = sql.fragment`${$pgSelectSingle.getClassStep().alias}.${sql.identifier("avatar_url")}`,
          sqlAggregate = spec.sqlAggregateWrap(sqlAttribute, TYPES.text);
        return $pgSelectSingle.select(sqlAggregate, TYPES.bigint);
      },
      bio($pgSelectSingle) {
        const sqlAttribute = sql.fragment`${$pgSelectSingle.getClassStep().alias}.${sql.identifier("bio")}`,
          sqlAggregate = spec.sqlAggregateWrap(sqlAttribute, TYPES.text);
        return $pgSelectSingle.select(sqlAggregate, TYPES.bigint);
      },
      createdAt($pgSelectSingle) {
        const sqlAttribute = sql.fragment`${$pgSelectSingle.getClassStep().alias}.${sql.identifier("created_at")}`,
          sqlAggregate = spec.sqlAggregateWrap(sqlAttribute, TYPES.timestamptz);
        return $pgSelectSingle.select(sqlAggregate, TYPES.bigint);
      },
      email($pgSelectSingle) {
        const sqlAttribute = sql.fragment`${$pgSelectSingle.getClassStep().alias}.${sql.identifier("email")}`,
          sqlAggregate = spec.sqlAggregateWrap(sqlAttribute, TYPES.text);
        return $pgSelectSingle.select(sqlAggregate, TYPES.bigint);
      },
      identityProviderId($pgSelectSingle) {
        const sqlAttribute = sql.fragment`${$pgSelectSingle.getClassStep().alias}.${sql.identifier("identity_provider_id")}`,
          sqlAggregate = spec.sqlAggregateWrap(sqlAttribute, TYPES.uuid);
        return $pgSelectSingle.select(sqlAggregate, TYPES.bigint);
      },
      name($pgSelectSingle) {
        const sqlAttribute = sql.fragment`${$pgSelectSingle.getClassStep().alias}.${sql.identifier("name")}`,
          sqlAggregate = spec.sqlAggregateWrap(sqlAttribute, TYPES.text);
        return $pgSelectSingle.select(sqlAggregate, TYPES.bigint);
      },
      rowId($pgSelectSingle) {
        const sqlAttribute = sql.fragment`${$pgSelectSingle.getClassStep().alias}.${sql.identifier("id")}`,
          sqlAggregate = spec.sqlAggregateWrap(sqlAttribute, TYPES.uuid);
        return $pgSelectSingle.select(sqlAggregate, TYPES.bigint);
      },
      updatedAt($pgSelectSingle) {
        const sqlAttribute = sql.fragment`${$pgSelectSingle.getClassStep().alias}.${sql.identifier("updated_at")}`,
          sqlAggregate = spec.sqlAggregateWrap(sqlAttribute, TYPES.timestamptz);
        return $pgSelectSingle.select(sqlAggregate, TYPES.bigint);
      },
      username($pgSelectSingle) {
        const sqlAttribute = sql.fragment`${$pgSelectSingle.getClassStep().alias}.${sql.identifier("username")}`,
          sqlAggregate = spec.sqlAggregateWrap(sqlAttribute, TYPES.text);
        return $pgSelectSingle.select(sqlAggregate, TYPES.bigint);
      }
    }
  }
};
export const interfaces = {
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
  BigIntFilter: {
    plans: {
      distinctFrom($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier17 ? resolveSqlIdentifier17(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec28 ? resolveInputCodec28(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve75(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "distinctFrom"
          });
        $where.where(fragment);
      },
      equalTo($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier17 ? resolveSqlIdentifier17(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec28 ? resolveInputCodec28(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve73(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "equalTo"
          });
        $where.where(fragment);
      },
      greaterThan($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier17 ? resolveSqlIdentifier17(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec28 ? resolveInputCodec28(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve81(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "greaterThan"
          });
        $where.where(fragment);
      },
      greaterThanOrEqualTo($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier17 ? resolveSqlIdentifier17(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec28 ? resolveInputCodec28(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve82(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "greaterThanOrEqualTo"
          });
        $where.where(fragment);
      },
      in($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier17 ? resolveSqlIdentifier17(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec29 ? resolveInputCodec29(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve77(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "in"
          });
        $where.where(fragment);
      },
      isNull($where, value) {
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
          [sqlIdentifier, identifierCodec] = [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec27 ? resolveInputCodec27(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = resolveSqlValue16 ? resolveSqlValue16($where, value, inputCodec) : sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve72(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "isNull"
          });
        $where.where(fragment);
      },
      lessThan($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier17 ? resolveSqlIdentifier17(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec28 ? resolveInputCodec28(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve79(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "lessThan"
          });
        $where.where(fragment);
      },
      lessThanOrEqualTo($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier17 ? resolveSqlIdentifier17(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec28 ? resolveInputCodec28(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve80(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "lessThanOrEqualTo"
          });
        $where.where(fragment);
      },
      notDistinctFrom($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier17 ? resolveSqlIdentifier17(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec28 ? resolveInputCodec28(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve76(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notDistinctFrom"
          });
        $where.where(fragment);
      },
      notEqualTo($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier17 ? resolveSqlIdentifier17(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec28 ? resolveInputCodec28(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve74(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notEqualTo"
          });
        $where.where(fragment);
      },
      notIn($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier17 ? resolveSqlIdentifier17(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec29 ? resolveInputCodec29(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve78(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notIn"
          });
        $where.where(fragment);
      }
    }
  },
  CreateOrganizationInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      },
      organization(qb, arg) {
        if (arg != null) return qb.setBuilder();
      }
    }
  },
  CreateOrganizationMemberInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      },
      organizationMember(qb, arg) {
        if (arg != null) return qb.setBuilder();
      }
    }
  },
  CreateRepositoryCollaboratorInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      },
      repositoryCollaborator(qb, arg) {
        if (arg != null) return qb.setBuilder();
      }
    }
  },
  CreateRepositoryInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      },
      repository(qb, arg) {
        if (arg != null) return qb.setBuilder();
      }
    }
  },
  CreateUserInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      },
      user(qb, arg) {
        if (arg != null) return qb.setBuilder();
      }
    }
  },
  DatetimeFilter: {
    plans: {
      distinctFrom($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier3 ? resolveSqlIdentifier3(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec8 ? resolveInputCodec8(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve26(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "distinctFrom"
          });
        $where.where(fragment);
      },
      equalTo($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier3 ? resolveSqlIdentifier3(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec8 ? resolveInputCodec8(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve24(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "equalTo"
          });
        $where.where(fragment);
      },
      greaterThan($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier3 ? resolveSqlIdentifier3(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec8 ? resolveInputCodec8(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve32(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "greaterThan"
          });
        $where.where(fragment);
      },
      greaterThanOrEqualTo($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier3 ? resolveSqlIdentifier3(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec8 ? resolveInputCodec8(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve33(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "greaterThanOrEqualTo"
          });
        $where.where(fragment);
      },
      in($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier3 ? resolveSqlIdentifier3(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec9 ? resolveInputCodec9(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve28(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "in"
          });
        $where.where(fragment);
      },
      isNull($where, value) {
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
          [sqlIdentifier, identifierCodec] = [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec7 ? resolveInputCodec7(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = resolveSqlValue3 ? resolveSqlValue3($where, value, inputCodec) : sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve23(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "isNull"
          });
        $where.where(fragment);
      },
      lessThan($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier3 ? resolveSqlIdentifier3(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec8 ? resolveInputCodec8(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve30(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "lessThan"
          });
        $where.where(fragment);
      },
      lessThanOrEqualTo($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier3 ? resolveSqlIdentifier3(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec8 ? resolveInputCodec8(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve31(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "lessThanOrEqualTo"
          });
        $where.where(fragment);
      },
      notDistinctFrom($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier3 ? resolveSqlIdentifier3(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec8 ? resolveInputCodec8(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve27(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notDistinctFrom"
          });
        $where.where(fragment);
      },
      notEqualTo($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier3 ? resolveSqlIdentifier3(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec8 ? resolveInputCodec8(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve25(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notEqualTo"
          });
        $where.where(fragment);
      },
      notIn($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier3 ? resolveSqlIdentifier3(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec9 ? resolveInputCodec9(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve29(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notIn"
          });
        $where.where(fragment);
      }
    }
  },
  DeleteOrganizationByIdInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      }
    }
  },
  DeleteOrganizationInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      }
    }
  },
  DeleteOrganizationMemberByIdInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      }
    }
  },
  DeleteOrganizationMemberInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      }
    }
  },
  DeleteRepositoryByIdInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      }
    }
  },
  DeleteRepositoryCollaboratorByIdInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      }
    }
  },
  DeleteRepositoryCollaboratorInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      }
    }
  },
  DeleteRepositoryInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      }
    }
  },
  DeleteUserByIdInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      }
    }
  },
  DeleteUserInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      }
    }
  },
  HavingDatetimeFilter: {
    plans: {
      equalTo($booleanFilter, input) {
        if (input == null) return;
        $booleanFilter.having(sql`(${sql.parens($booleanFilter.expression)} ${infix()} ${sqlValueWithCodec(input, TYPES.timestamptz)})`);
      },
      greaterThan($booleanFilter, input) {
        if (input == null) return;
        $booleanFilter.having(sql`(${sql.parens($booleanFilter.expression)} ${infix3()} ${sqlValueWithCodec(input, TYPES.timestamptz)})`);
      },
      greaterThanOrEqualTo($booleanFilter, input) {
        if (input == null) return;
        $booleanFilter.having(sql`(${sql.parens($booleanFilter.expression)} ${infix4()} ${sqlValueWithCodec(input, TYPES.timestamptz)})`);
      },
      lessThan($booleanFilter, input) {
        if (input == null) return;
        $booleanFilter.having(sql`(${sql.parens($booleanFilter.expression)} ${infix5()} ${sqlValueWithCodec(input, TYPES.timestamptz)})`);
      },
      lessThanOrEqualTo($booleanFilter, input) {
        if (input == null) return;
        $booleanFilter.having(sql`(${sql.parens($booleanFilter.expression)} ${infix6()} ${sqlValueWithCodec(input, TYPES.timestamptz)})`);
      },
      notEqualTo($booleanFilter, input) {
        if (input == null) return;
        $booleanFilter.having(sql`(${sql.parens($booleanFilter.expression)} ${infix2()} ${sqlValueWithCodec(input, TYPES.timestamptz)})`);
      }
    }
  },
  OrganizationCondition: {
    plans: {
      avatarUrl($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "avatar_url",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.text)}`;
          }
        });
      },
      createdAt($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "created_at",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.timestamptz)}`;
          }
        });
      },
      description($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "description",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.text)}`;
          }
        });
      },
      name($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "name",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.text)}`;
          }
        });
      },
      rowId($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "id",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.uuid)}`;
          }
        });
      },
      slug($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "slug",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.text)}`;
          }
        });
      },
      stripeCustomerId($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "stripe_customer_id",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.text)}`;
          }
        });
      },
      stripeSubscriptionId($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "stripe_subscription_id",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.text)}`;
          }
        });
      },
      tier($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "tier",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, tierCodec)}`;
          }
        });
      },
      updatedAt($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "updated_at",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.timestamptz)}`;
          }
        });
      }
    }
  },
  OrganizationFilter: {
    plans: {
      and($where, value) {
        assertAllowed11(value, "list");
        if (value == null) return;
        return $where.andPlan();
      },
      avatarUrl(queryBuilder, value) {
        if (value === void 0) return;
        if (!true && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec10;
        return condition;
      },
      createdAt(queryBuilder, value) {
        if (value === void 0) return;
        if (!true && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec14;
        return condition;
      },
      description(queryBuilder, value) {
        if (value === void 0) return;
        if (!true && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec9;
        return condition;
      },
      name(queryBuilder, value) {
        if (value === void 0) return;
        if (!true && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec7;
        return condition;
      },
      not($where, value) {
        assertAllowed11(value, "object");
        if (value == null) return;
        return $where.notPlan().andPlan();
      },
      or($where, value) {
        assertAllowed11(value, "list");
        if (value == null) return;
        const $or = $where.orPlan();
        return () => $or.andPlan();
      },
      organizationMembers($where, value) {
        assertAllowed10(value, "object");
        const $rel = $where.andPlan();
        $rel.extensions.pgFilterRelation = {
          tableExpression: organizationMemberIdentifier,
          alias: resource_organization_memberPgResource.name,
          localAttributes: registryConfig.pgRelations.organization.organizationMembersByTheirOrganizationId.localAttributes,
          remoteAttributes: registryConfig.pgRelations.organization.organizationMembersByTheirOrganizationId.remoteAttributes
        };
        return $rel;
      },
      organizationMembersExist($where, value) {
        assertAllowed10(value, "scalar");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: organizationMemberIdentifier,
          alias: resource_organization_memberPgResource.name,
          equals: value
        });
        registryConfig.pgRelations.organization.organizationMembersByTheirOrganizationId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.organization.organizationMembersByTheirOrganizationId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
      },
      repositories($where, value) {
        assertAllowed10(value, "object");
        const $rel = $where.andPlan();
        $rel.extensions.pgFilterRelation = {
          tableExpression: repositoryIdentifier,
          alias: resource_repositoryPgResource.name,
          localAttributes: registryConfig.pgRelations.organization.repositoriesByTheirOrganizationId.localAttributes,
          remoteAttributes: registryConfig.pgRelations.organization.repositoriesByTheirOrganizationId.remoteAttributes
        };
        return $rel;
      },
      repositoriesExist($where, value) {
        assertAllowed10(value, "scalar");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: repositoryIdentifier,
          alias: resource_repositoryPgResource.name,
          equals: value
        });
        registryConfig.pgRelations.organization.repositoriesByTheirOrganizationId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.organization.repositoriesByTheirOrganizationId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
      },
      rowId(queryBuilder, value) {
        if (value === void 0) return;
        if (!true && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec6;
        return condition;
      },
      slug(queryBuilder, value) {
        if (value === void 0) return;
        if (!true && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec8;
        return condition;
      },
      stripeCustomerId(queryBuilder, value) {
        if (value === void 0) return;
        if (!true && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec12;
        return condition;
      },
      stripeSubscriptionId(queryBuilder, value) {
        if (value === void 0) return;
        if (!true && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec13;
        return condition;
      },
      tier(queryBuilder, value) {
        if (value === void 0) return;
        if (!true && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec11;
        return condition;
      },
      updatedAt(queryBuilder, value) {
        if (value === void 0) return;
        if (!true && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec15;
        return condition;
      }
    }
  },
  OrganizationHavingAverageInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = aggregateSpec4.sqlAggregateWrap(attributeExpression, spec_organization.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = aggregateSpec4.sqlAggregateWrap(attributeExpression, spec_organization.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  OrganizationHavingDistinctCountInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = spec.sqlAggregateWrap(attributeExpression, spec_organization.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = spec.sqlAggregateWrap(attributeExpression, spec_organization.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  OrganizationHavingInput: {
    plans: {
      AND($where) {
        return $where;
      },
      average($having) {
        return $having;
      },
      distinctCount($having) {
        return $having;
      },
      max($having) {
        return $having;
      },
      min($having) {
        return $having;
      },
      OR($where) {
        return new PgOrFilter($where);
      },
      stddevPopulation($having) {
        return $having;
      },
      stddevSample($having) {
        return $having;
      },
      sum($having) {
        return $having;
      },
      variancePopulation($having) {
        return $having;
      },
      varianceSample($having) {
        return $having;
      }
    }
  },
  OrganizationHavingMaxInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = aggregateSpec3.sqlAggregateWrap(attributeExpression, spec_organization.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = aggregateSpec3.sqlAggregateWrap(attributeExpression, spec_organization.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  OrganizationHavingMinInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = aggregateSpec2.sqlAggregateWrap(attributeExpression, spec_organization.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = aggregateSpec2.sqlAggregateWrap(attributeExpression, spec_organization.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  OrganizationHavingStddevPopulationInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = aggregateSpec6.sqlAggregateWrap(attributeExpression, spec_organization.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = aggregateSpec6.sqlAggregateWrap(attributeExpression, spec_organization.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  OrganizationHavingStddevSampleInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = aggregateSpec5.sqlAggregateWrap(attributeExpression, spec_organization.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = aggregateSpec5.sqlAggregateWrap(attributeExpression, spec_organization.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  OrganizationHavingSumInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = aggregateSpec.sqlAggregateWrap(attributeExpression, spec_organization.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = aggregateSpec.sqlAggregateWrap(attributeExpression, spec_organization.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  OrganizationHavingVariancePopulationInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = aggregateSpec8.sqlAggregateWrap(attributeExpression, spec_organization.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = aggregateSpec8.sqlAggregateWrap(attributeExpression, spec_organization.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  OrganizationHavingVarianceSampleInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = aggregateSpec7.sqlAggregateWrap(attributeExpression, spec_organization.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = aggregateSpec7.sqlAggregateWrap(attributeExpression, spec_organization.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  OrganizationInput: {
    baked: createObjectAndApplyChildren,
    plans: {
      avatarUrl(obj, val, {
        field,
        schema
      }) {
        obj.set("avatar_url", bakedInputRuntime(schema, field.type, val));
      },
      createdAt(obj, val, {
        field,
        schema
      }) {
        obj.set("created_at", bakedInputRuntime(schema, field.type, val));
      },
      description(obj, val, {
        field,
        schema
      }) {
        obj.set("description", bakedInputRuntime(schema, field.type, val));
      },
      name(obj, val, {
        field,
        schema
      }) {
        obj.set("name", bakedInputRuntime(schema, field.type, val));
      },
      rowId(obj, val, {
        field,
        schema
      }) {
        obj.set("id", bakedInputRuntime(schema, field.type, val));
      },
      slug(obj, val, {
        field,
        schema
      }) {
        obj.set("slug", bakedInputRuntime(schema, field.type, val));
      },
      stripeCustomerId(obj, val, {
        field,
        schema
      }) {
        obj.set("stripe_customer_id", bakedInputRuntime(schema, field.type, val));
      },
      updatedAt(obj, val, {
        field,
        schema
      }) {
        obj.set("updated_at", bakedInputRuntime(schema, field.type, val));
      }
    }
  },
  OrganizationMemberAggregatesFilter: {
    plans: {
      distinctCount($subquery, input) {
        if (input == null) return;
        return $subquery.forAggregate(spec);
      },
      filter($subquery, input) {
        if (input == null) return;
        return new PgCondition($subquery, !1, "AND");
      }
    }
  },
  OrganizationMemberCondition: {
    plans: {
      createdAt($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "created_at",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.timestamptz)}`;
          }
        });
      },
      organizationId($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "organization_id",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.uuid)}`;
          }
        });
      },
      role($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "role",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, roleCodec)}`;
          }
        });
      },
      updatedAt($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "updated_at",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.timestamptz)}`;
          }
        });
      },
      userId($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "user_id",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.uuid)}`;
          }
        });
      }
    }
  },
  OrganizationMemberDistinctCountAggregateFilter: {
    plans: {
      createdAt($parent, input) {
        if (input == null) return;
        const $col = new PgCondition($parent);
        $col.extensions.pgFilterAttribute = {
          codec: TYPES.bigint,
          expression: spec.sqlAggregateWrap(sql`${$col.alias}.${sql.identifier("created_at")}`, spec_organizationMember.attributes.created_at.codec)
        };
        return $col;
      },
      organizationId($parent, input) {
        if (input == null) return;
        const $col = new PgCondition($parent);
        $col.extensions.pgFilterAttribute = {
          codec: TYPES.bigint,
          expression: spec.sqlAggregateWrap(sql`${$col.alias}.${sql.identifier("organization_id")}`, spec_organizationMember.attributes.organization_id.codec)
        };
        return $col;
      },
      role($parent, input) {
        if (input == null) return;
        const $col = new PgCondition($parent);
        $col.extensions.pgFilterAttribute = {
          codec: TYPES.bigint,
          expression: spec.sqlAggregateWrap(sql`${$col.alias}.${sql.identifier("role")}`, spec_organizationMember.attributes.role.codec)
        };
        return $col;
      },
      updatedAt($parent, input) {
        if (input == null) return;
        const $col = new PgCondition($parent);
        $col.extensions.pgFilterAttribute = {
          codec: TYPES.bigint,
          expression: spec.sqlAggregateWrap(sql`${$col.alias}.${sql.identifier("updated_at")}`, spec_organizationMember.attributes.updated_at.codec)
        };
        return $col;
      },
      userId($parent, input) {
        if (input == null) return;
        const $col = new PgCondition($parent);
        $col.extensions.pgFilterAttribute = {
          codec: TYPES.bigint,
          expression: spec.sqlAggregateWrap(sql`${$col.alias}.${sql.identifier("user_id")}`, spec_organizationMember.attributes.user_id.codec)
        };
        return $col;
      }
    }
  },
  OrganizationMemberFilter: {
    plans: {
      and($where, value) {
        assertAllowed9(value, "list");
        if (value == null) return;
        return $where.andPlan();
      },
      createdAt(queryBuilder, value) {
        if (value === void 0) return;
        if (!true && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec4;
        return condition;
      },
      not($where, value) {
        assertAllowed9(value, "object");
        if (value == null) return;
        return $where.notPlan().andPlan();
      },
      or($where, value) {
        assertAllowed9(value, "list");
        if (value == null) return;
        const $or = $where.orPlan();
        return () => $or.andPlan();
      },
      organization($where, value) {
        assertAllowed8(value, "object");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: organizationIdentifier,
          alias: resource_organizationPgResource.name
        });
        registryConfig.pgRelations.organizationMember.organizationByMyOrganizationId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.organizationMember.organizationByMyOrganizationId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
        return $subQuery;
      },
      organizationId(queryBuilder, value) {
        if (value === void 0) return;
        if (!true && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec;
        return condition;
      },
      role(queryBuilder, value) {
        if (value === void 0) return;
        if (!true && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec3;
        return condition;
      },
      updatedAt(queryBuilder, value) {
        if (value === void 0) return;
        if (!true && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec5;
        return condition;
      },
      user($where, value) {
        assertAllowed8(value, "object");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: userIdentifier,
          alias: resource_userPgResource.name
        });
        registryConfig.pgRelations.organizationMember.userByMyUserId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.organizationMember.userByMyUserId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
        return $subQuery;
      },
      userId(queryBuilder, value) {
        if (value === void 0) return;
        if (!true && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec2;
        return condition;
      }
    }
  },
  OrganizationMemberHavingAverageInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = aggregateSpec4.sqlAggregateWrap(attributeExpression, spec_organizationMember.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = aggregateSpec4.sqlAggregateWrap(attributeExpression, spec_organizationMember.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  OrganizationMemberHavingDistinctCountInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = spec.sqlAggregateWrap(attributeExpression, spec_organizationMember.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = spec.sqlAggregateWrap(attributeExpression, spec_organizationMember.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  OrganizationMemberHavingInput: {
    plans: {
      AND($where) {
        return $where;
      },
      average($having) {
        return $having;
      },
      distinctCount($having) {
        return $having;
      },
      max($having) {
        return $having;
      },
      min($having) {
        return $having;
      },
      OR($where) {
        return new PgOrFilter($where);
      },
      stddevPopulation($having) {
        return $having;
      },
      stddevSample($having) {
        return $having;
      },
      sum($having) {
        return $having;
      },
      variancePopulation($having) {
        return $having;
      },
      varianceSample($having) {
        return $having;
      }
    }
  },
  OrganizationMemberHavingMaxInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = aggregateSpec3.sqlAggregateWrap(attributeExpression, spec_organizationMember.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = aggregateSpec3.sqlAggregateWrap(attributeExpression, spec_organizationMember.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  OrganizationMemberHavingMinInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = aggregateSpec2.sqlAggregateWrap(attributeExpression, spec_organizationMember.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = aggregateSpec2.sqlAggregateWrap(attributeExpression, spec_organizationMember.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  OrganizationMemberHavingStddevPopulationInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = aggregateSpec6.sqlAggregateWrap(attributeExpression, spec_organizationMember.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = aggregateSpec6.sqlAggregateWrap(attributeExpression, spec_organizationMember.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  OrganizationMemberHavingStddevSampleInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = aggregateSpec5.sqlAggregateWrap(attributeExpression, spec_organizationMember.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = aggregateSpec5.sqlAggregateWrap(attributeExpression, spec_organizationMember.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  OrganizationMemberHavingSumInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = aggregateSpec.sqlAggregateWrap(attributeExpression, spec_organizationMember.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = aggregateSpec.sqlAggregateWrap(attributeExpression, spec_organizationMember.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  OrganizationMemberHavingVariancePopulationInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = aggregateSpec8.sqlAggregateWrap(attributeExpression, spec_organizationMember.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = aggregateSpec8.sqlAggregateWrap(attributeExpression, spec_organizationMember.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  OrganizationMemberHavingVarianceSampleInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = aggregateSpec7.sqlAggregateWrap(attributeExpression, spec_organizationMember.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = aggregateSpec7.sqlAggregateWrap(attributeExpression, spec_organizationMember.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  OrganizationMemberInput: {
    baked: createObjectAndApplyChildren,
    plans: {
      createdAt(obj, val, {
        field,
        schema
      }) {
        obj.set("created_at", bakedInputRuntime(schema, field.type, val));
      },
      organizationId(obj, val, {
        field,
        schema
      }) {
        obj.set("organization_id", bakedInputRuntime(schema, field.type, val));
      },
      role(obj, val, {
        field,
        schema
      }) {
        obj.set("role", bakedInputRuntime(schema, field.type, val));
      },
      updatedAt(obj, val, {
        field,
        schema
      }) {
        obj.set("updated_at", bakedInputRuntime(schema, field.type, val));
      },
      userId(obj, val, {
        field,
        schema
      }) {
        obj.set("user_id", bakedInputRuntime(schema, field.type, val));
      }
    }
  },
  OrganizationMemberPatch: {
    baked: createObjectAndApplyChildren,
    plans: {
      createdAt(obj, val, {
        field,
        schema
      }) {
        obj.set("created_at", bakedInputRuntime(schema, field.type, val));
      },
      organizationId(obj, val, {
        field,
        schema
      }) {
        obj.set("organization_id", bakedInputRuntime(schema, field.type, val));
      },
      role(obj, val, {
        field,
        schema
      }) {
        obj.set("role", bakedInputRuntime(schema, field.type, val));
      },
      updatedAt(obj, val, {
        field,
        schema
      }) {
        obj.set("updated_at", bakedInputRuntime(schema, field.type, val));
      },
      userId(obj, val, {
        field,
        schema
      }) {
        obj.set("user_id", bakedInputRuntime(schema, field.type, val));
      }
    }
  },
  OrganizationPatch: {
    baked: createObjectAndApplyChildren,
    plans: {
      avatarUrl(obj, val, {
        field,
        schema
      }) {
        obj.set("avatar_url", bakedInputRuntime(schema, field.type, val));
      },
      createdAt(obj, val, {
        field,
        schema
      }) {
        obj.set("created_at", bakedInputRuntime(schema, field.type, val));
      },
      description(obj, val, {
        field,
        schema
      }) {
        obj.set("description", bakedInputRuntime(schema, field.type, val));
      },
      name(obj, val, {
        field,
        schema
      }) {
        obj.set("name", bakedInputRuntime(schema, field.type, val));
      },
      rowId(obj, val, {
        field,
        schema
      }) {
        obj.set("id", bakedInputRuntime(schema, field.type, val));
      },
      slug(obj, val, {
        field,
        schema
      }) {
        obj.set("slug", bakedInputRuntime(schema, field.type, val));
      },
      stripeCustomerId(obj, val, {
        field,
        schema
      }) {
        obj.set("stripe_customer_id", bakedInputRuntime(schema, field.type, val));
      },
      updatedAt(obj, val, {
        field,
        schema
      }) {
        obj.set("updated_at", bakedInputRuntime(schema, field.type, val));
      }
    }
  },
  OrganizationToManyOrganizationMemberFilter: {
    plans: {
      aggregates($where, input) {
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
      },
      every($where, value) {
        assertAllowed12(value, "object");
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
      },
      none($where, value) {
        assertAllowed12(value, "object");
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
        return $subQuery;
      },
      some($where, value) {
        assertAllowed12(value, "object");
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
        return $subQuery;
      }
    }
  },
  OrganizationToManyRepositoryFilter: {
    plans: {
      aggregates($where, input) {
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
      },
      every($where, value) {
        assertAllowed13(value, "object");
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
      },
      none($where, value) {
        assertAllowed13(value, "object");
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
        return $subQuery;
      },
      some($where, value) {
        assertAllowed13(value, "object");
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
        return $subQuery;
      }
    }
  },
  PermissionFilter: {
    plans: {
      distinctFrom($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier19 ? resolveSqlIdentifier19(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec34 ? resolveInputCodec34(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve97(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "distinctFrom"
          });
        $where.where(fragment);
      },
      equalTo($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier19 ? resolveSqlIdentifier19(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec34 ? resolveInputCodec34(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve95(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "equalTo"
          });
        $where.where(fragment);
      },
      greaterThan($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier19 ? resolveSqlIdentifier19(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec34 ? resolveInputCodec34(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve103(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "greaterThan"
          });
        $where.where(fragment);
      },
      greaterThanOrEqualTo($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier19 ? resolveSqlIdentifier19(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec34 ? resolveInputCodec34(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve104(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "greaterThanOrEqualTo"
          });
        $where.where(fragment);
      },
      in($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier19 ? resolveSqlIdentifier19(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec35 ? resolveInputCodec35(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve99(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "in"
          });
        $where.where(fragment);
      },
      isNull($where, value) {
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
          [sqlIdentifier, identifierCodec] = [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec33 ? resolveInputCodec33(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = resolveSqlValue18 ? resolveSqlValue18($where, value, inputCodec) : sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve94(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "isNull"
          });
        $where.where(fragment);
      },
      lessThan($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier19 ? resolveSqlIdentifier19(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec34 ? resolveInputCodec34(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve101(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "lessThan"
          });
        $where.where(fragment);
      },
      lessThanOrEqualTo($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier19 ? resolveSqlIdentifier19(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec34 ? resolveInputCodec34(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve102(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "lessThanOrEqualTo"
          });
        $where.where(fragment);
      },
      notDistinctFrom($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier19 ? resolveSqlIdentifier19(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec34 ? resolveInputCodec34(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve98(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notDistinctFrom"
          });
        $where.where(fragment);
      },
      notEqualTo($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier19 ? resolveSqlIdentifier19(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec34 ? resolveInputCodec34(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve96(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notEqualTo"
          });
        $where.where(fragment);
      },
      notIn($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier19 ? resolveSqlIdentifier19(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec35 ? resolveInputCodec35(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve100(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notIn"
          });
        $where.where(fragment);
      }
    }
  },
  RepositoryAggregatesFilter: {
    plans: {
      distinctCount($subquery, input) {
        if (input == null) return;
        return $subquery.forAggregate(spec);
      },
      filter($subquery, input) {
        if (input == null) return;
        return new PgCondition($subquery, !1, "AND");
      }
    }
  },
  RepositoryCollaboratorAggregatesFilter: {
    plans: {
      distinctCount($subquery, input) {
        if (input == null) return;
        return $subquery.forAggregate(spec);
      },
      filter($subquery, input) {
        if (input == null) return;
        return new PgCondition($subquery, !1, "AND");
      }
    }
  },
  RepositoryCollaboratorCondition: {
    plans: {
      createdAt($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "created_at",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.timestamptz)}`;
          }
        });
      },
      permission($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "permission",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, permissionCodec)}`;
          }
        });
      },
      repositoryId($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "repository_id",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.uuid)}`;
          }
        });
      },
      updatedAt($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "updated_at",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.timestamptz)}`;
          }
        });
      },
      userId($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "user_id",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.uuid)}`;
          }
        });
      }
    }
  },
  RepositoryCollaboratorDistinctCountAggregateFilter: {
    plans: {
      createdAt($parent, input) {
        if (input == null) return;
        const $col = new PgCondition($parent);
        $col.extensions.pgFilterAttribute = {
          codec: TYPES.bigint,
          expression: spec.sqlAggregateWrap(sql`${$col.alias}.${sql.identifier("created_at")}`, spec_repositoryCollaborator.attributes.created_at.codec)
        };
        return $col;
      },
      permission($parent, input) {
        if (input == null) return;
        const $col = new PgCondition($parent);
        $col.extensions.pgFilterAttribute = {
          codec: TYPES.bigint,
          expression: spec.sqlAggregateWrap(sql`${$col.alias}.${sql.identifier("permission")}`, spec_repositoryCollaborator.attributes.permission.codec)
        };
        return $col;
      },
      repositoryId($parent, input) {
        if (input == null) return;
        const $col = new PgCondition($parent);
        $col.extensions.pgFilterAttribute = {
          codec: TYPES.bigint,
          expression: spec.sqlAggregateWrap(sql`${$col.alias}.${sql.identifier("repository_id")}`, spec_repositoryCollaborator.attributes.repository_id.codec)
        };
        return $col;
      },
      updatedAt($parent, input) {
        if (input == null) return;
        const $col = new PgCondition($parent);
        $col.extensions.pgFilterAttribute = {
          codec: TYPES.bigint,
          expression: spec.sqlAggregateWrap(sql`${$col.alias}.${sql.identifier("updated_at")}`, spec_repositoryCollaborator.attributes.updated_at.codec)
        };
        return $col;
      },
      userId($parent, input) {
        if (input == null) return;
        const $col = new PgCondition($parent);
        $col.extensions.pgFilterAttribute = {
          codec: TYPES.bigint,
          expression: spec.sqlAggregateWrap(sql`${$col.alias}.${sql.identifier("user_id")}`, spec_repositoryCollaborator.attributes.user_id.codec)
        };
        return $col;
      }
    }
  },
  RepositoryCollaboratorFilter: {
    plans: {
      and($where, value) {
        assertAllowed19(value, "list");
        if (value == null) return;
        return $where.andPlan();
      },
      createdAt(queryBuilder, value) {
        if (value === void 0) return;
        if (!true && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec29;
        return condition;
      },
      not($where, value) {
        assertAllowed19(value, "object");
        if (value == null) return;
        return $where.notPlan().andPlan();
      },
      or($where, value) {
        assertAllowed19(value, "list");
        if (value == null) return;
        const $or = $where.orPlan();
        return () => $or.andPlan();
      },
      permission(queryBuilder, value) {
        if (value === void 0) return;
        if (!true && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec28;
        return condition;
      },
      repository($where, value) {
        assertAllowed18(value, "object");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: repositoryIdentifier,
          alias: resource_repositoryPgResource.name
        });
        registryConfig.pgRelations.repositoryCollaborator.repositoryByMyRepositoryId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.repositoryCollaborator.repositoryByMyRepositoryId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
        return $subQuery;
      },
      repositoryId(queryBuilder, value) {
        if (value === void 0) return;
        if (!true && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec26;
        return condition;
      },
      updatedAt(queryBuilder, value) {
        if (value === void 0) return;
        if (!true && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec30;
        return condition;
      },
      user($where, value) {
        assertAllowed18(value, "object");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: userIdentifier,
          alias: resource_userPgResource.name
        });
        registryConfig.pgRelations.repositoryCollaborator.userByMyUserId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.repositoryCollaborator.userByMyUserId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
        return $subQuery;
      },
      userId(queryBuilder, value) {
        if (value === void 0) return;
        if (!true && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec27;
        return condition;
      }
    }
  },
  RepositoryCollaboratorHavingAverageInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = aggregateSpec4.sqlAggregateWrap(attributeExpression, spec_repositoryCollaborator.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = aggregateSpec4.sqlAggregateWrap(attributeExpression, spec_repositoryCollaborator.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  RepositoryCollaboratorHavingDistinctCountInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = spec.sqlAggregateWrap(attributeExpression, spec_repositoryCollaborator.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = spec.sqlAggregateWrap(attributeExpression, spec_repositoryCollaborator.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  RepositoryCollaboratorHavingInput: {
    plans: {
      AND($where) {
        return $where;
      },
      average($having) {
        return $having;
      },
      distinctCount($having) {
        return $having;
      },
      max($having) {
        return $having;
      },
      min($having) {
        return $having;
      },
      OR($where) {
        return new PgOrFilter($where);
      },
      stddevPopulation($having) {
        return $having;
      },
      stddevSample($having) {
        return $having;
      },
      sum($having) {
        return $having;
      },
      variancePopulation($having) {
        return $having;
      },
      varianceSample($having) {
        return $having;
      }
    }
  },
  RepositoryCollaboratorHavingMaxInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = aggregateSpec3.sqlAggregateWrap(attributeExpression, spec_repositoryCollaborator.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = aggregateSpec3.sqlAggregateWrap(attributeExpression, spec_repositoryCollaborator.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  RepositoryCollaboratorHavingMinInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = aggregateSpec2.sqlAggregateWrap(attributeExpression, spec_repositoryCollaborator.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = aggregateSpec2.sqlAggregateWrap(attributeExpression, spec_repositoryCollaborator.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  RepositoryCollaboratorHavingStddevPopulationInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = aggregateSpec6.sqlAggregateWrap(attributeExpression, spec_repositoryCollaborator.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = aggregateSpec6.sqlAggregateWrap(attributeExpression, spec_repositoryCollaborator.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  RepositoryCollaboratorHavingStddevSampleInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = aggregateSpec5.sqlAggregateWrap(attributeExpression, spec_repositoryCollaborator.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = aggregateSpec5.sqlAggregateWrap(attributeExpression, spec_repositoryCollaborator.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  RepositoryCollaboratorHavingSumInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = aggregateSpec.sqlAggregateWrap(attributeExpression, spec_repositoryCollaborator.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = aggregateSpec.sqlAggregateWrap(attributeExpression, spec_repositoryCollaborator.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  RepositoryCollaboratorHavingVariancePopulationInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = aggregateSpec8.sqlAggregateWrap(attributeExpression, spec_repositoryCollaborator.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = aggregateSpec8.sqlAggregateWrap(attributeExpression, spec_repositoryCollaborator.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  RepositoryCollaboratorHavingVarianceSampleInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = aggregateSpec7.sqlAggregateWrap(attributeExpression, spec_repositoryCollaborator.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = aggregateSpec7.sqlAggregateWrap(attributeExpression, spec_repositoryCollaborator.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  RepositoryCollaboratorInput: {
    baked: createObjectAndApplyChildren,
    plans: {
      createdAt(obj, val, {
        field,
        schema
      }) {
        obj.set("created_at", bakedInputRuntime(schema, field.type, val));
      },
      permission(obj, val, {
        field,
        schema
      }) {
        obj.set("permission", bakedInputRuntime(schema, field.type, val));
      },
      repositoryId(obj, val, {
        field,
        schema
      }) {
        obj.set("repository_id", bakedInputRuntime(schema, field.type, val));
      },
      updatedAt(obj, val, {
        field,
        schema
      }) {
        obj.set("updated_at", bakedInputRuntime(schema, field.type, val));
      },
      userId(obj, val, {
        field,
        schema
      }) {
        obj.set("user_id", bakedInputRuntime(schema, field.type, val));
      }
    }
  },
  RepositoryCollaboratorPatch: {
    baked: createObjectAndApplyChildren,
    plans: {
      createdAt(obj, val, {
        field,
        schema
      }) {
        obj.set("created_at", bakedInputRuntime(schema, field.type, val));
      },
      permission(obj, val, {
        field,
        schema
      }) {
        obj.set("permission", bakedInputRuntime(schema, field.type, val));
      },
      repositoryId(obj, val, {
        field,
        schema
      }) {
        obj.set("repository_id", bakedInputRuntime(schema, field.type, val));
      },
      updatedAt(obj, val, {
        field,
        schema
      }) {
        obj.set("updated_at", bakedInputRuntime(schema, field.type, val));
      },
      userId(obj, val, {
        field,
        schema
      }) {
        obj.set("user_id", bakedInputRuntime(schema, field.type, val));
      }
    }
  },
  RepositoryCondition: {
    plans: {
      createdAt($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "created_at",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.timestamptz)}`;
          }
        });
      },
      defaultBranch($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "default_branch",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.text)}`;
          }
        });
      },
      description($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "description",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.text)}`;
          }
        });
      },
      name($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "name",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.text)}`;
          }
        });
      },
      organizationId($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "organization_id",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.uuid)}`;
          }
        });
      },
      ownerId($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "owner_id",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.uuid)}`;
          }
        });
      },
      rowId($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "id",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.uuid)}`;
          }
        });
      },
      slug($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "slug",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.text)}`;
          }
        });
      },
      updatedAt($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "updated_at",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.timestamptz)}`;
          }
        });
      },
      visibility($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "visibility",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, visibilityCodec)}`;
          }
        });
      }
    }
  },
  RepositoryDistinctCountAggregateFilter: {
    plans: {
      createdAt($parent, input) {
        if (input == null) return;
        const $col = new PgCondition($parent);
        $col.extensions.pgFilterAttribute = {
          codec: TYPES.bigint,
          expression: spec.sqlAggregateWrap(sql`${$col.alias}.${sql.identifier("created_at")}`, spec_repository.attributes.created_at.codec)
        };
        return $col;
      },
      defaultBranch($parent, input) {
        if (input == null) return;
        const $col = new PgCondition($parent);
        $col.extensions.pgFilterAttribute = {
          codec: TYPES.bigint,
          expression: spec.sqlAggregateWrap(sql`${$col.alias}.${sql.identifier("default_branch")}`, spec_repository.attributes.default_branch.codec)
        };
        return $col;
      },
      description($parent, input) {
        if (input == null) return;
        const $col = new PgCondition($parent);
        $col.extensions.pgFilterAttribute = {
          codec: TYPES.bigint,
          expression: spec.sqlAggregateWrap(sql`${$col.alias}.${sql.identifier("description")}`, spec_repository.attributes.description.codec)
        };
        return $col;
      },
      name($parent, input) {
        if (input == null) return;
        const $col = new PgCondition($parent);
        $col.extensions.pgFilterAttribute = {
          codec: TYPES.bigint,
          expression: spec.sqlAggregateWrap(sql`${$col.alias}.${sql.identifier("name")}`, spec_repository.attributes.name.codec)
        };
        return $col;
      },
      organizationId($parent, input) {
        if (input == null) return;
        const $col = new PgCondition($parent);
        $col.extensions.pgFilterAttribute = {
          codec: TYPES.bigint,
          expression: spec.sqlAggregateWrap(sql`${$col.alias}.${sql.identifier("organization_id")}`, spec_repository.attributes.organization_id.codec)
        };
        return $col;
      },
      ownerId($parent, input) {
        if (input == null) return;
        const $col = new PgCondition($parent);
        $col.extensions.pgFilterAttribute = {
          codec: TYPES.bigint,
          expression: spec.sqlAggregateWrap(sql`${$col.alias}.${sql.identifier("owner_id")}`, spec_repository.attributes.owner_id.codec)
        };
        return $col;
      },
      rowId($parent, input) {
        if (input == null) return;
        const $col = new PgCondition($parent);
        $col.extensions.pgFilterAttribute = {
          codec: TYPES.bigint,
          expression: spec.sqlAggregateWrap(sql`${$col.alias}.${sql.identifier("id")}`, spec_repository.attributes.id.codec)
        };
        return $col;
      },
      slug($parent, input) {
        if (input == null) return;
        const $col = new PgCondition($parent);
        $col.extensions.pgFilterAttribute = {
          codec: TYPES.bigint,
          expression: spec.sqlAggregateWrap(sql`${$col.alias}.${sql.identifier("slug")}`, spec_repository.attributes.slug.codec)
        };
        return $col;
      },
      updatedAt($parent, input) {
        if (input == null) return;
        const $col = new PgCondition($parent);
        $col.extensions.pgFilterAttribute = {
          codec: TYPES.bigint,
          expression: spec.sqlAggregateWrap(sql`${$col.alias}.${sql.identifier("updated_at")}`, spec_repository.attributes.updated_at.codec)
        };
        return $col;
      },
      visibility($parent, input) {
        if (input == null) return;
        const $col = new PgCondition($parent);
        $col.extensions.pgFilterAttribute = {
          codec: TYPES.bigint,
          expression: spec.sqlAggregateWrap(sql`${$col.alias}.${sql.identifier("visibility")}`, spec_repository.attributes.visibility.codec)
        };
        return $col;
      }
    }
  },
  RepositoryFilter: {
    plans: {
      and($where, value) {
        assertAllowed16(value, "list");
        if (value == null) return;
        return $where.andPlan();
      },
      createdAt(queryBuilder, value) {
        if (value === void 0) return;
        if (!true && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec24;
        return condition;
      },
      defaultBranch(queryBuilder, value) {
        if (value === void 0) return;
        if (!true && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec23;
        return condition;
      },
      description(queryBuilder, value) {
        if (value === void 0) return;
        if (!true && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec21;
        return condition;
      },
      name(queryBuilder, value) {
        if (value === void 0) return;
        if (!true && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec19;
        return condition;
      },
      not($where, value) {
        assertAllowed16(value, "object");
        if (value == null) return;
        return $where.notPlan().andPlan();
      },
      or($where, value) {
        assertAllowed16(value, "list");
        if (value == null) return;
        const $or = $where.orPlan();
        return () => $or.andPlan();
      },
      organization($where, value) {
        assertAllowed15(value, "object");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: organizationIdentifier,
          alias: resource_organizationPgResource.name
        });
        registryConfig.pgRelations.repository.organizationByMyOrganizationId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.repository.organizationByMyOrganizationId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
        return $subQuery;
      },
      organizationExists($where, value) {
        assertAllowed15(value, "scalar");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: organizationIdentifier,
          alias: resource_organizationPgResource.name,
          equals: value
        });
        registryConfig.pgRelations.repository.organizationByMyOrganizationId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.repository.organizationByMyOrganizationId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
      },
      organizationId(queryBuilder, value) {
        if (value === void 0) return;
        if (!true && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec18;
        return condition;
      },
      owner($where, value) {
        assertAllowed15(value, "object");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: userIdentifier,
          alias: resource_userPgResource.name
        });
        registryConfig.pgRelations.repository.userByMyOwnerId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.repository.userByMyOwnerId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
        return $subQuery;
      },
      ownerId(queryBuilder, value) {
        if (value === void 0) return;
        if (!true && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec17;
        return condition;
      },
      repositoryCollaborators($where, value) {
        assertAllowed14(value, "object");
        const $rel = $where.andPlan();
        $rel.extensions.pgFilterRelation = {
          tableExpression: repositoryCollaboratorIdentifier,
          alias: resource_repository_collaboratorPgResource.name,
          localAttributes: registryConfig.pgRelations.repository.repositoryCollaboratorsByTheirRepositoryId.localAttributes,
          remoteAttributes: registryConfig.pgRelations.repository.repositoryCollaboratorsByTheirRepositoryId.remoteAttributes
        };
        return $rel;
      },
      repositoryCollaboratorsExist($where, value) {
        assertAllowed14(value, "scalar");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: repositoryCollaboratorIdentifier,
          alias: resource_repository_collaboratorPgResource.name,
          equals: value
        });
        registryConfig.pgRelations.repository.repositoryCollaboratorsByTheirRepositoryId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.repository.repositoryCollaboratorsByTheirRepositoryId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
      },
      rowId(queryBuilder, value) {
        if (value === void 0) return;
        if (!true && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec16;
        return condition;
      },
      slug(queryBuilder, value) {
        if (value === void 0) return;
        if (!true && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec20;
        return condition;
      },
      updatedAt(queryBuilder, value) {
        if (value === void 0) return;
        if (!true && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec25;
        return condition;
      },
      visibility(queryBuilder, value) {
        if (value === void 0) return;
        if (!true && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec22;
        return condition;
      }
    }
  },
  RepositoryHavingAverageInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = aggregateSpec4.sqlAggregateWrap(attributeExpression, spec_repository.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = aggregateSpec4.sqlAggregateWrap(attributeExpression, spec_repository.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  RepositoryHavingDistinctCountInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = spec.sqlAggregateWrap(attributeExpression, spec_repository.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = spec.sqlAggregateWrap(attributeExpression, spec_repository.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  RepositoryHavingInput: {
    plans: {
      AND($where) {
        return $where;
      },
      average($having) {
        return $having;
      },
      distinctCount($having) {
        return $having;
      },
      max($having) {
        return $having;
      },
      min($having) {
        return $having;
      },
      OR($where) {
        return new PgOrFilter($where);
      },
      stddevPopulation($having) {
        return $having;
      },
      stddevSample($having) {
        return $having;
      },
      sum($having) {
        return $having;
      },
      variancePopulation($having) {
        return $having;
      },
      varianceSample($having) {
        return $having;
      }
    }
  },
  RepositoryHavingMaxInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = aggregateSpec3.sqlAggregateWrap(attributeExpression, spec_repository.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = aggregateSpec3.sqlAggregateWrap(attributeExpression, spec_repository.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  RepositoryHavingMinInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = aggregateSpec2.sqlAggregateWrap(attributeExpression, spec_repository.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = aggregateSpec2.sqlAggregateWrap(attributeExpression, spec_repository.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  RepositoryHavingStddevPopulationInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = aggregateSpec6.sqlAggregateWrap(attributeExpression, spec_repository.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = aggregateSpec6.sqlAggregateWrap(attributeExpression, spec_repository.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  RepositoryHavingStddevSampleInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = aggregateSpec5.sqlAggregateWrap(attributeExpression, spec_repository.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = aggregateSpec5.sqlAggregateWrap(attributeExpression, spec_repository.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  RepositoryHavingSumInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = aggregateSpec.sqlAggregateWrap(attributeExpression, spec_repository.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = aggregateSpec.sqlAggregateWrap(attributeExpression, spec_repository.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  RepositoryHavingVariancePopulationInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = aggregateSpec8.sqlAggregateWrap(attributeExpression, spec_repository.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = aggregateSpec8.sqlAggregateWrap(attributeExpression, spec_repository.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  RepositoryHavingVarianceSampleInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = aggregateSpec7.sqlAggregateWrap(attributeExpression, spec_repository.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = aggregateSpec7.sqlAggregateWrap(attributeExpression, spec_repository.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  RepositoryInput: {
    baked: createObjectAndApplyChildren,
    plans: {
      createdAt(obj, val, {
        field,
        schema
      }) {
        obj.set("created_at", bakedInputRuntime(schema, field.type, val));
      },
      defaultBranch(obj, val, {
        field,
        schema
      }) {
        obj.set("default_branch", bakedInputRuntime(schema, field.type, val));
      },
      description(obj, val, {
        field,
        schema
      }) {
        obj.set("description", bakedInputRuntime(schema, field.type, val));
      },
      name(obj, val, {
        field,
        schema
      }) {
        obj.set("name", bakedInputRuntime(schema, field.type, val));
      },
      organizationId(obj, val, {
        field,
        schema
      }) {
        obj.set("organization_id", bakedInputRuntime(schema, field.type, val));
      },
      ownerId(obj, val, {
        field,
        schema
      }) {
        obj.set("owner_id", bakedInputRuntime(schema, field.type, val));
      },
      rowId(obj, val, {
        field,
        schema
      }) {
        obj.set("id", bakedInputRuntime(schema, field.type, val));
      },
      slug(obj, val, {
        field,
        schema
      }) {
        obj.set("slug", bakedInputRuntime(schema, field.type, val));
      },
      updatedAt(obj, val, {
        field,
        schema
      }) {
        obj.set("updated_at", bakedInputRuntime(schema, field.type, val));
      },
      visibility(obj, val, {
        field,
        schema
      }) {
        obj.set("visibility", bakedInputRuntime(schema, field.type, val));
      }
    }
  },
  RepositoryPatch: {
    baked: createObjectAndApplyChildren,
    plans: {
      createdAt(obj, val, {
        field,
        schema
      }) {
        obj.set("created_at", bakedInputRuntime(schema, field.type, val));
      },
      defaultBranch(obj, val, {
        field,
        schema
      }) {
        obj.set("default_branch", bakedInputRuntime(schema, field.type, val));
      },
      description(obj, val, {
        field,
        schema
      }) {
        obj.set("description", bakedInputRuntime(schema, field.type, val));
      },
      name(obj, val, {
        field,
        schema
      }) {
        obj.set("name", bakedInputRuntime(schema, field.type, val));
      },
      organizationId(obj, val, {
        field,
        schema
      }) {
        obj.set("organization_id", bakedInputRuntime(schema, field.type, val));
      },
      ownerId(obj, val, {
        field,
        schema
      }) {
        obj.set("owner_id", bakedInputRuntime(schema, field.type, val));
      },
      rowId(obj, val, {
        field,
        schema
      }) {
        obj.set("id", bakedInputRuntime(schema, field.type, val));
      },
      slug(obj, val, {
        field,
        schema
      }) {
        obj.set("slug", bakedInputRuntime(schema, field.type, val));
      },
      updatedAt(obj, val, {
        field,
        schema
      }) {
        obj.set("updated_at", bakedInputRuntime(schema, field.type, val));
      },
      visibility(obj, val, {
        field,
        schema
      }) {
        obj.set("visibility", bakedInputRuntime(schema, field.type, val));
      }
    }
  },
  RepositoryToManyRepositoryCollaboratorFilter: {
    plans: {
      aggregates($where, input) {
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
      },
      every($where, value) {
        assertAllowed17(value, "object");
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
      },
      none($where, value) {
        assertAllowed17(value, "object");
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
        return $subQuery;
      },
      some($where, value) {
        assertAllowed17(value, "object");
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
        return $subQuery;
      }
    }
  },
  RoleFilter: {
    plans: {
      distinctFrom($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier2 ? resolveSqlIdentifier2(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec5 ? resolveInputCodec5(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve15(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "distinctFrom"
          });
        $where.where(fragment);
      },
      equalTo($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier2 ? resolveSqlIdentifier2(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec5 ? resolveInputCodec5(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve13(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "equalTo"
          });
        $where.where(fragment);
      },
      greaterThan($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier2 ? resolveSqlIdentifier2(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec5 ? resolveInputCodec5(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve21(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "greaterThan"
          });
        $where.where(fragment);
      },
      greaterThanOrEqualTo($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier2 ? resolveSqlIdentifier2(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec5 ? resolveInputCodec5(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve22(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "greaterThanOrEqualTo"
          });
        $where.where(fragment);
      },
      in($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier2 ? resolveSqlIdentifier2(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec6 ? resolveInputCodec6(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve17(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "in"
          });
        $where.where(fragment);
      },
      isNull($where, value) {
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
          [sqlIdentifier, identifierCodec] = [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec4 ? resolveInputCodec4(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = resolveSqlValue2 ? resolveSqlValue2($where, value, inputCodec) : sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve12(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "isNull"
          });
        $where.where(fragment);
      },
      lessThan($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier2 ? resolveSqlIdentifier2(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec5 ? resolveInputCodec5(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve19(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "lessThan"
          });
        $where.where(fragment);
      },
      lessThanOrEqualTo($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier2 ? resolveSqlIdentifier2(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec5 ? resolveInputCodec5(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve20(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "lessThanOrEqualTo"
          });
        $where.where(fragment);
      },
      notDistinctFrom($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier2 ? resolveSqlIdentifier2(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec5 ? resolveInputCodec5(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve16(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notDistinctFrom"
          });
        $where.where(fragment);
      },
      notEqualTo($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier2 ? resolveSqlIdentifier2(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec5 ? resolveInputCodec5(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve14(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notEqualTo"
          });
        $where.where(fragment);
      },
      notIn($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier2 ? resolveSqlIdentifier2(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec6 ? resolveInputCodec6(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve18(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notIn"
          });
        $where.where(fragment);
      }
    }
  },
  StringFilter: {
    plans: {
      distinctFrom($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier4 ? resolveSqlIdentifier4(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec11 ? resolveInputCodec11(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve37(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "distinctFrom"
          });
        $where.where(fragment);
      },
      distinctFromInsensitive($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier8 ? resolveSqlIdentifier8(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec16 ? resolveInputCodec16(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = resolveSqlValue7 ? resolveSqlValue7($where, value, inputCodec) : sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve37(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "distinctFromInsensitive"
          });
        $where.where(fragment);
      },
      endsWith($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier4 ? resolveSqlIdentifier4(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = resolveInput9 ? resolveInput9(value) : value,
          inputCodec = resolveInputCodec11 ? resolveInputCodec11(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve53(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "endsWith"
          });
        $where.where(fragment);
      },
      endsWithInsensitive($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier5 ? resolveSqlIdentifier5(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = resolveInput11 ? resolveInput11(value) : value,
          inputCodec = resolveInputCodec13 ? resolveInputCodec13(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve55(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "endsWithInsensitive"
          });
        $where.where(fragment);
      },
      equalTo($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier4 ? resolveSqlIdentifier4(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec11 ? resolveInputCodec11(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve35(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "equalTo"
          });
        $where.where(fragment);
      },
      equalToInsensitive($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier6 ? resolveSqlIdentifier6(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec14 ? resolveInputCodec14(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = resolveSqlValue5 ? resolveSqlValue5($where, value, inputCodec) : sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve35(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "equalToInsensitive"
          });
        $where.where(fragment);
      },
      greaterThan($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier4 ? resolveSqlIdentifier4(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec11 ? resolveInputCodec11(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve43(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "greaterThan"
          });
        $where.where(fragment);
      },
      greaterThanInsensitive($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier14 ? resolveSqlIdentifier14(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec22 ? resolveInputCodec22(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = resolveSqlValue13 ? resolveSqlValue13($where, value, inputCodec) : sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve43(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "greaterThanInsensitive"
          });
        $where.where(fragment);
      },
      greaterThanOrEqualTo($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier4 ? resolveSqlIdentifier4(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec11 ? resolveInputCodec11(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve44(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "greaterThanOrEqualTo"
          });
        $where.where(fragment);
      },
      greaterThanOrEqualToInsensitive($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier15 ? resolveSqlIdentifier15(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec23 ? resolveInputCodec23(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = resolveSqlValue14 ? resolveSqlValue14($where, value, inputCodec) : sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve44(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "greaterThanOrEqualToInsensitive"
          });
        $where.where(fragment);
      },
      in($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier4 ? resolveSqlIdentifier4(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec12 ? resolveInputCodec12(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve39(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "in"
          });
        $where.where(fragment);
      },
      includes($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier4 ? resolveSqlIdentifier4(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = resolveInput ? resolveInput(value) : value,
          inputCodec = resolveInputCodec11 ? resolveInputCodec11(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve45(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "includes"
          });
        $where.where(fragment);
      },
      includesInsensitive($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier5 ? resolveSqlIdentifier5(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = resolveInput3 ? resolveInput3(value) : value,
          inputCodec = resolveInputCodec13 ? resolveInputCodec13(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve47(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "includesInsensitive"
          });
        $where.where(fragment);
      },
      inInsensitive($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier10 ? resolveSqlIdentifier10(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec18 ? resolveInputCodec18(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = resolveSqlValue9 ? resolveSqlValue9($where, value, inputCodec) : sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve39(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "inInsensitive"
          });
        $where.where(fragment);
      },
      isNull($where, value) {
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
          [sqlIdentifier, identifierCodec] = [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec10 ? resolveInputCodec10(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = resolveSqlValue4 ? resolveSqlValue4($where, value, inputCodec) : sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve34(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "isNull"
          });
        $where.where(fragment);
      },
      lessThan($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier4 ? resolveSqlIdentifier4(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec11 ? resolveInputCodec11(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve41(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "lessThan"
          });
        $where.where(fragment);
      },
      lessThanInsensitive($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier12 ? resolveSqlIdentifier12(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec20 ? resolveInputCodec20(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = resolveSqlValue11 ? resolveSqlValue11($where, value, inputCodec) : sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve41(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "lessThanInsensitive"
          });
        $where.where(fragment);
      },
      lessThanOrEqualTo($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier4 ? resolveSqlIdentifier4(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec11 ? resolveInputCodec11(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve42(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "lessThanOrEqualTo"
          });
        $where.where(fragment);
      },
      lessThanOrEqualToInsensitive($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier13 ? resolveSqlIdentifier13(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec21 ? resolveInputCodec21(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = resolveSqlValue12 ? resolveSqlValue12($where, value, inputCodec) : sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve42(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "lessThanOrEqualToInsensitive"
          });
        $where.where(fragment);
      },
      like($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier4 ? resolveSqlIdentifier4(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec11 ? resolveInputCodec11(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve57(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "like"
          });
        $where.where(fragment);
      },
      likeInsensitive($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier5 ? resolveSqlIdentifier5(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec13 ? resolveInputCodec13(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve59(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "likeInsensitive"
          });
        $where.where(fragment);
      },
      notDistinctFrom($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier4 ? resolveSqlIdentifier4(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec11 ? resolveInputCodec11(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve38(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notDistinctFrom"
          });
        $where.where(fragment);
      },
      notDistinctFromInsensitive($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier9 ? resolveSqlIdentifier9(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec17 ? resolveInputCodec17(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = resolveSqlValue8 ? resolveSqlValue8($where, value, inputCodec) : sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve38(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notDistinctFromInsensitive"
          });
        $where.where(fragment);
      },
      notEndsWith($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier4 ? resolveSqlIdentifier4(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = resolveInput10 ? resolveInput10(value) : value,
          inputCodec = resolveInputCodec11 ? resolveInputCodec11(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve54(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notEndsWith"
          });
        $where.where(fragment);
      },
      notEndsWithInsensitive($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier5 ? resolveSqlIdentifier5(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = resolveInput12 ? resolveInput12(value) : value,
          inputCodec = resolveInputCodec13 ? resolveInputCodec13(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve56(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notEndsWithInsensitive"
          });
        $where.where(fragment);
      },
      notEqualTo($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier4 ? resolveSqlIdentifier4(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec11 ? resolveInputCodec11(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve36(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notEqualTo"
          });
        $where.where(fragment);
      },
      notEqualToInsensitive($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier7 ? resolveSqlIdentifier7(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec15 ? resolveInputCodec15(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = resolveSqlValue6 ? resolveSqlValue6($where, value, inputCodec) : sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve36(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notEqualToInsensitive"
          });
        $where.where(fragment);
      },
      notIn($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier4 ? resolveSqlIdentifier4(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec12 ? resolveInputCodec12(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve40(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notIn"
          });
        $where.where(fragment);
      },
      notIncludes($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier4 ? resolveSqlIdentifier4(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = resolveInput2 ? resolveInput2(value) : value,
          inputCodec = resolveInputCodec11 ? resolveInputCodec11(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve46(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notIncludes"
          });
        $where.where(fragment);
      },
      notIncludesInsensitive($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier5 ? resolveSqlIdentifier5(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = resolveInput4 ? resolveInput4(value) : value,
          inputCodec = resolveInputCodec13 ? resolveInputCodec13(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve48(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notIncludesInsensitive"
          });
        $where.where(fragment);
      },
      notInInsensitive($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier11 ? resolveSqlIdentifier11(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec19 ? resolveInputCodec19(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = resolveSqlValue10 ? resolveSqlValue10($where, value, inputCodec) : sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve40(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notInInsensitive"
          });
        $where.where(fragment);
      },
      notLike($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier4 ? resolveSqlIdentifier4(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec11 ? resolveInputCodec11(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve58(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notLike"
          });
        $where.where(fragment);
      },
      notLikeInsensitive($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier5 ? resolveSqlIdentifier5(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec13 ? resolveInputCodec13(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve60(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notLikeInsensitive"
          });
        $where.where(fragment);
      },
      notStartsWith($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier4 ? resolveSqlIdentifier4(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = resolveInput6 ? resolveInput6(value) : value,
          inputCodec = resolveInputCodec11 ? resolveInputCodec11(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve50(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notStartsWith"
          });
        $where.where(fragment);
      },
      notStartsWithInsensitive($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier5 ? resolveSqlIdentifier5(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = resolveInput8 ? resolveInput8(value) : value,
          inputCodec = resolveInputCodec13 ? resolveInputCodec13(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve52(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notStartsWithInsensitive"
          });
        $where.where(fragment);
      },
      startsWith($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier4 ? resolveSqlIdentifier4(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = resolveInput5 ? resolveInput5(value) : value,
          inputCodec = resolveInputCodec11 ? resolveInputCodec11(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve49(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "startsWith"
          });
        $where.where(fragment);
      },
      startsWithInsensitive($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier5 ? resolveSqlIdentifier5(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = resolveInput7 ? resolveInput7(value) : value,
          inputCodec = resolveInputCodec13 ? resolveInputCodec13(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve51(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "startsWithInsensitive"
          });
        $where.where(fragment);
      }
    }
  },
  TierFilter: {
    plans: {
      distinctFrom($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier16 ? resolveSqlIdentifier16(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec25 ? resolveInputCodec25(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve64(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "distinctFrom"
          });
        $where.where(fragment);
      },
      equalTo($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier16 ? resolveSqlIdentifier16(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec25 ? resolveInputCodec25(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve62(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "equalTo"
          });
        $where.where(fragment);
      },
      greaterThan($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier16 ? resolveSqlIdentifier16(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec25 ? resolveInputCodec25(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve70(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "greaterThan"
          });
        $where.where(fragment);
      },
      greaterThanOrEqualTo($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier16 ? resolveSqlIdentifier16(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec25 ? resolveInputCodec25(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve71(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "greaterThanOrEqualTo"
          });
        $where.where(fragment);
      },
      in($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier16 ? resolveSqlIdentifier16(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec26 ? resolveInputCodec26(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve66(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "in"
          });
        $where.where(fragment);
      },
      isNull($where, value) {
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
          [sqlIdentifier, identifierCodec] = [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec24 ? resolveInputCodec24(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = resolveSqlValue15 ? resolveSqlValue15($where, value, inputCodec) : sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve61(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "isNull"
          });
        $where.where(fragment);
      },
      lessThan($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier16 ? resolveSqlIdentifier16(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec25 ? resolveInputCodec25(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve68(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "lessThan"
          });
        $where.where(fragment);
      },
      lessThanOrEqualTo($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier16 ? resolveSqlIdentifier16(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec25 ? resolveInputCodec25(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve69(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "lessThanOrEqualTo"
          });
        $where.where(fragment);
      },
      notDistinctFrom($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier16 ? resolveSqlIdentifier16(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec25 ? resolveInputCodec25(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve65(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notDistinctFrom"
          });
        $where.where(fragment);
      },
      notEqualTo($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier16 ? resolveSqlIdentifier16(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec25 ? resolveInputCodec25(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve63(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notEqualTo"
          });
        $where.where(fragment);
      },
      notIn($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier16 ? resolveSqlIdentifier16(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec26 ? resolveInputCodec26(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve67(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notIn"
          });
        $where.where(fragment);
      }
    }
  },
  UpdateOrganizationByIdInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      },
      patch(qb, arg) {
        if (arg != null) return qb.setBuilder();
      }
    }
  },
  UpdateOrganizationInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      },
      patch(qb, arg) {
        if (arg != null) return qb.setBuilder();
      }
    }
  },
  UpdateOrganizationMemberByIdInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      },
      patch(qb, arg) {
        if (arg != null) return qb.setBuilder();
      }
    }
  },
  UpdateOrganizationMemberInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      },
      patch(qb, arg) {
        if (arg != null) return qb.setBuilder();
      }
    }
  },
  UpdateRepositoryByIdInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      },
      patch(qb, arg) {
        if (arg != null) return qb.setBuilder();
      }
    }
  },
  UpdateRepositoryCollaboratorByIdInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      },
      patch(qb, arg) {
        if (arg != null) return qb.setBuilder();
      }
    }
  },
  UpdateRepositoryCollaboratorInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      },
      patch(qb, arg) {
        if (arg != null) return qb.setBuilder();
      }
    }
  },
  UpdateRepositoryInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      },
      patch(qb, arg) {
        if (arg != null) return qb.setBuilder();
      }
    }
  },
  UpdateUserByIdInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      },
      patch(qb, arg) {
        if (arg != null) return qb.setBuilder();
      }
    }
  },
  UpdateUserInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      },
      patch(qb, arg) {
        if (arg != null) return qb.setBuilder();
      }
    }
  },
  UserCondition: {
    plans: {
      avatarUrl($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "avatar_url",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.text)}`;
          }
        });
      },
      bio($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "bio",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.text)}`;
          }
        });
      },
      createdAt($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "created_at",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.timestamptz)}`;
          }
        });
      },
      email($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "email",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.text)}`;
          }
        });
      },
      identityProviderId($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "identity_provider_id",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.uuid)}`;
          }
        });
      },
      name($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "name",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.text)}`;
          }
        });
      },
      rowId($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "id",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.uuid)}`;
          }
        });
      },
      updatedAt($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "updated_at",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.timestamptz)}`;
          }
        });
      },
      username($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "username",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.text)}`;
          }
        });
      }
    }
  },
  UserFilter: {
    plans: {
      and($where, value) {
        assertAllowed21(value, "list");
        if (value == null) return;
        return $where.andPlan();
      },
      avatarUrl(queryBuilder, value) {
        if (value === void 0) return;
        if (!true && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec34;
        return condition;
      },
      bio(queryBuilder, value) {
        if (value === void 0) return;
        if (!true && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec39;
        return condition;
      },
      createdAt(queryBuilder, value) {
        if (value === void 0) return;
        if (!true && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec36;
        return condition;
      },
      email(queryBuilder, value) {
        if (value === void 0) return;
        if (!true && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec35;
        return condition;
      },
      identityProviderId(queryBuilder, value) {
        if (value === void 0) return;
        if (!true && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec32;
        return condition;
      },
      name(queryBuilder, value) {
        if (value === void 0) return;
        if (!true && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec33;
        return condition;
      },
      not($where, value) {
        assertAllowed21(value, "object");
        if (value == null) return;
        return $where.notPlan().andPlan();
      },
      or($where, value) {
        assertAllowed21(value, "list");
        if (value == null) return;
        const $or = $where.orPlan();
        return () => $or.andPlan();
      },
      organizationMembers($where, value) {
        assertAllowed20(value, "object");
        const $rel = $where.andPlan();
        $rel.extensions.pgFilterRelation = {
          tableExpression: organizationMemberIdentifier,
          alias: resource_organization_memberPgResource.name,
          localAttributes: registryConfig.pgRelations.user.organizationMembersByTheirUserId.localAttributes,
          remoteAttributes: registryConfig.pgRelations.user.organizationMembersByTheirUserId.remoteAttributes
        };
        return $rel;
      },
      organizationMembersExist($where, value) {
        assertAllowed20(value, "scalar");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: organizationMemberIdentifier,
          alias: resource_organization_memberPgResource.name,
          equals: value
        });
        registryConfig.pgRelations.user.organizationMembersByTheirUserId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.user.organizationMembersByTheirUserId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
      },
      repositoriesByOwnerId($where, value) {
        assertAllowed20(value, "object");
        const $rel = $where.andPlan();
        $rel.extensions.pgFilterRelation = {
          tableExpression: repositoryIdentifier,
          alias: resource_repositoryPgResource.name,
          localAttributes: registryConfig.pgRelations.user.repositoriesByTheirOwnerId.localAttributes,
          remoteAttributes: registryConfig.pgRelations.user.repositoriesByTheirOwnerId.remoteAttributes
        };
        return $rel;
      },
      repositoriesByOwnerIdExist($where, value) {
        assertAllowed20(value, "scalar");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: repositoryIdentifier,
          alias: resource_repositoryPgResource.name,
          equals: value
        });
        registryConfig.pgRelations.user.repositoriesByTheirOwnerId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.user.repositoriesByTheirOwnerId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
      },
      repositoryCollaborators($where, value) {
        assertAllowed20(value, "object");
        const $rel = $where.andPlan();
        $rel.extensions.pgFilterRelation = {
          tableExpression: repositoryCollaboratorIdentifier,
          alias: resource_repository_collaboratorPgResource.name,
          localAttributes: registryConfig.pgRelations.user.repositoryCollaboratorsByTheirUserId.localAttributes,
          remoteAttributes: registryConfig.pgRelations.user.repositoryCollaboratorsByTheirUserId.remoteAttributes
        };
        return $rel;
      },
      repositoryCollaboratorsExist($where, value) {
        assertAllowed20(value, "scalar");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: repositoryCollaboratorIdentifier,
          alias: resource_repository_collaboratorPgResource.name,
          equals: value
        });
        registryConfig.pgRelations.user.repositoryCollaboratorsByTheirUserId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.user.repositoryCollaboratorsByTheirUserId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
      },
      rowId(queryBuilder, value) {
        if (value === void 0) return;
        if (!true && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec31;
        return condition;
      },
      updatedAt(queryBuilder, value) {
        if (value === void 0) return;
        if (!true && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec37;
        return condition;
      },
      username(queryBuilder, value) {
        if (value === void 0) return;
        if (!true && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec38;
        return condition;
      }
    }
  },
  UserHavingAverageInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = aggregateSpec4.sqlAggregateWrap(attributeExpression, spec_user.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = aggregateSpec4.sqlAggregateWrap(attributeExpression, spec_user.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  UserHavingDistinctCountInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = spec.sqlAggregateWrap(attributeExpression, spec_user.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = spec.sqlAggregateWrap(attributeExpression, spec_user.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  UserHavingInput: {
    plans: {
      AND($where) {
        return $where;
      },
      average($having) {
        return $having;
      },
      distinctCount($having) {
        return $having;
      },
      max($having) {
        return $having;
      },
      min($having) {
        return $having;
      },
      OR($where) {
        return new PgOrFilter($where);
      },
      stddevPopulation($having) {
        return $having;
      },
      stddevSample($having) {
        return $having;
      },
      sum($having) {
        return $having;
      },
      variancePopulation($having) {
        return $having;
      },
      varianceSample($having) {
        return $having;
      }
    }
  },
  UserHavingMaxInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = aggregateSpec3.sqlAggregateWrap(attributeExpression, spec_user.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = aggregateSpec3.sqlAggregateWrap(attributeExpression, spec_user.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  UserHavingMinInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = aggregateSpec2.sqlAggregateWrap(attributeExpression, spec_user.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = aggregateSpec2.sqlAggregateWrap(attributeExpression, spec_user.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  UserHavingStddevPopulationInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = aggregateSpec6.sqlAggregateWrap(attributeExpression, spec_user.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = aggregateSpec6.sqlAggregateWrap(attributeExpression, spec_user.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  UserHavingStddevSampleInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = aggregateSpec5.sqlAggregateWrap(attributeExpression, spec_user.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = aggregateSpec5.sqlAggregateWrap(attributeExpression, spec_user.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  UserHavingSumInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = aggregateSpec.sqlAggregateWrap(attributeExpression, spec_user.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = aggregateSpec.sqlAggregateWrap(attributeExpression, spec_user.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  UserHavingVariancePopulationInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = aggregateSpec8.sqlAggregateWrap(attributeExpression, spec_user.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = aggregateSpec8.sqlAggregateWrap(attributeExpression, spec_user.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  UserHavingVarianceSampleInput: {
    plans: {
      createdAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("created_at")}`,
          aggregateExpression = aggregateSpec7.sqlAggregateWrap(attributeExpression, spec_user.attributes.created_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      },
      updatedAt($having) {
        const attributeExpression = sql.fragment`${$having.alias}.${sql.identifier("updated_at")}`,
          aggregateExpression = aggregateSpec7.sqlAggregateWrap(attributeExpression, spec_user.attributes.updated_at.codec);
        return new PgBooleanFilter($having, aggregateExpression);
      }
    }
  },
  UserInput: {
    baked: createObjectAndApplyChildren,
    plans: {
      avatarUrl(obj, val, {
        field,
        schema
      }) {
        obj.set("avatar_url", bakedInputRuntime(schema, field.type, val));
      },
      bio(obj, val, {
        field,
        schema
      }) {
        obj.set("bio", bakedInputRuntime(schema, field.type, val));
      },
      createdAt(obj, val, {
        field,
        schema
      }) {
        obj.set("created_at", bakedInputRuntime(schema, field.type, val));
      },
      email(obj, val, {
        field,
        schema
      }) {
        obj.set("email", bakedInputRuntime(schema, field.type, val));
      },
      identityProviderId(obj, val, {
        field,
        schema
      }) {
        obj.set("identity_provider_id", bakedInputRuntime(schema, field.type, val));
      },
      name(obj, val, {
        field,
        schema
      }) {
        obj.set("name", bakedInputRuntime(schema, field.type, val));
      },
      rowId(obj, val, {
        field,
        schema
      }) {
        obj.set("id", bakedInputRuntime(schema, field.type, val));
      },
      updatedAt(obj, val, {
        field,
        schema
      }) {
        obj.set("updated_at", bakedInputRuntime(schema, field.type, val));
      },
      username(obj, val, {
        field,
        schema
      }) {
        obj.set("username", bakedInputRuntime(schema, field.type, val));
      }
    }
  },
  UserPatch: {
    baked: createObjectAndApplyChildren,
    plans: {
      avatarUrl(obj, val, {
        field,
        schema
      }) {
        obj.set("avatar_url", bakedInputRuntime(schema, field.type, val));
      },
      bio(obj, val, {
        field,
        schema
      }) {
        obj.set("bio", bakedInputRuntime(schema, field.type, val));
      },
      createdAt(obj, val, {
        field,
        schema
      }) {
        obj.set("created_at", bakedInputRuntime(schema, field.type, val));
      },
      email(obj, val, {
        field,
        schema
      }) {
        obj.set("email", bakedInputRuntime(schema, field.type, val));
      },
      identityProviderId(obj, val, {
        field,
        schema
      }) {
        obj.set("identity_provider_id", bakedInputRuntime(schema, field.type, val));
      },
      name(obj, val, {
        field,
        schema
      }) {
        obj.set("name", bakedInputRuntime(schema, field.type, val));
      },
      rowId(obj, val, {
        field,
        schema
      }) {
        obj.set("id", bakedInputRuntime(schema, field.type, val));
      },
      updatedAt(obj, val, {
        field,
        schema
      }) {
        obj.set("updated_at", bakedInputRuntime(schema, field.type, val));
      },
      username(obj, val, {
        field,
        schema
      }) {
        obj.set("username", bakedInputRuntime(schema, field.type, val));
      }
    }
  },
  UserToManyOrganizationMemberFilter: {
    plans: {
      aggregates($where, input) {
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
      },
      every($where, value) {
        assertAllowed22(value, "object");
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
      },
      none($where, value) {
        assertAllowed22(value, "object");
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
        return $subQuery;
      },
      some($where, value) {
        assertAllowed22(value, "object");
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
        return $subQuery;
      }
    }
  },
  UserToManyRepositoryCollaboratorFilter: {
    plans: {
      aggregates($where, input) {
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
      },
      every($where, value) {
        assertAllowed24(value, "object");
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
      },
      none($where, value) {
        assertAllowed24(value, "object");
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
        return $subQuery;
      },
      some($where, value) {
        assertAllowed24(value, "object");
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
        return $subQuery;
      }
    }
  },
  UserToManyRepositoryFilter: {
    plans: {
      aggregates($where, input) {
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
      },
      every($where, value) {
        assertAllowed23(value, "object");
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
      },
      none($where, value) {
        assertAllowed23(value, "object");
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
        return $subQuery;
      },
      some($where, value) {
        assertAllowed23(value, "object");
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
        return $subQuery;
      }
    }
  },
  UUIDFilter: {
    plans: {
      distinctFrom($where, value) {
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
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec2 ? resolveInputCodec2(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve4(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "distinctFrom"
          });
        $where.where(fragment);
      },
      equalTo($where, value) {
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
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec2 ? resolveInputCodec2(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve2(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "equalTo"
          });
        $where.where(fragment);
      },
      greaterThan($where, value) {
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
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec2 ? resolveInputCodec2(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve10(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "greaterThan"
          });
        $where.where(fragment);
      },
      greaterThanOrEqualTo($where, value) {
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
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec2 ? resolveInputCodec2(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve11(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "greaterThanOrEqualTo"
          });
        $where.where(fragment);
      },
      in($where, value) {
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
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec3 ? resolveInputCodec3(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve6(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "in"
          });
        $where.where(fragment);
      },
      isNull($where, value) {
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
          [sqlIdentifier, identifierCodec] = [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec ? resolveInputCodec(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = resolveSqlValue ? resolveSqlValue($where, value, inputCodec) : sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "isNull"
          });
        $where.where(fragment);
      },
      lessThan($where, value) {
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
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec2 ? resolveInputCodec2(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve8(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "lessThan"
          });
        $where.where(fragment);
      },
      lessThanOrEqualTo($where, value) {
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
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec2 ? resolveInputCodec2(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve9(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "lessThanOrEqualTo"
          });
        $where.where(fragment);
      },
      notDistinctFrom($where, value) {
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
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec2 ? resolveInputCodec2(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve5(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notDistinctFrom"
          });
        $where.where(fragment);
      },
      notEqualTo($where, value) {
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
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec2 ? resolveInputCodec2(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve3(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notEqualTo"
          });
        $where.where(fragment);
      },
      notIn($where, value) {
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
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec3 ? resolveInputCodec3(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve7(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notIn"
          });
        $where.where(fragment);
      }
    }
  },
  VisibilityFilter: {
    plans: {
      distinctFrom($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier18 ? resolveSqlIdentifier18(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec31 ? resolveInputCodec31(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve86(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "distinctFrom"
          });
        $where.where(fragment);
      },
      equalTo($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier18 ? resolveSqlIdentifier18(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec31 ? resolveInputCodec31(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve84(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "equalTo"
          });
        $where.where(fragment);
      },
      greaterThan($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier18 ? resolveSqlIdentifier18(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec31 ? resolveInputCodec31(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve92(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "greaterThan"
          });
        $where.where(fragment);
      },
      greaterThanOrEqualTo($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier18 ? resolveSqlIdentifier18(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec31 ? resolveInputCodec31(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve93(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "greaterThanOrEqualTo"
          });
        $where.where(fragment);
      },
      in($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier18 ? resolveSqlIdentifier18(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec32 ? resolveInputCodec32(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve88(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "in"
          });
        $where.where(fragment);
      },
      isNull($where, value) {
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
          [sqlIdentifier, identifierCodec] = [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec30 ? resolveInputCodec30(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = resolveSqlValue17 ? resolveSqlValue17($where, value, inputCodec) : sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve83(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "isNull"
          });
        $where.where(fragment);
      },
      lessThan($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier18 ? resolveSqlIdentifier18(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec31 ? resolveInputCodec31(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve90(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "lessThan"
          });
        $where.where(fragment);
      },
      lessThanOrEqualTo($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier18 ? resolveSqlIdentifier18(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec31 ? resolveInputCodec31(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve91(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "lessThanOrEqualTo"
          });
        $where.where(fragment);
      },
      notDistinctFrom($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier18 ? resolveSqlIdentifier18(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec31 ? resolveInputCodec31(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve87(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notDistinctFrom"
          });
        $where.where(fragment);
      },
      notEqualTo($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier18 ? resolveSqlIdentifier18(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec31 ? resolveInputCodec31(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve85(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notEqualTo"
          });
        $where.where(fragment);
      },
      notIn($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier18 ? resolveSqlIdentifier18(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (true && value === null) return;
        if (!true && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec32 ? resolveInputCodec32(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve89(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notIn"
          });
        $where.where(fragment);
      }
    }
  }
};
export const scalars = {
  BigInt: {
    serialize: UUIDSerialize,
    parseValue: UUIDSerialize,
    parseLiteral(ast) {
      if (ast.kind !== Kind.STRING) throw new GraphQLError(`${"BigInt" ?? "This scalar"} can only parse string values (kind='${ast.kind}')`);
      return ast.value;
    }
  },
  Cursor: {
    serialize: UUIDSerialize,
    parseValue: UUIDSerialize,
    parseLiteral(ast) {
      if (ast.kind !== Kind.STRING) throw new GraphQLError(`${"Cursor" ?? "This scalar"} can only parse string values (kind='${ast.kind}')`);
      return ast.value;
    }
  },
  Datetime: {
    serialize: UUIDSerialize,
    parseValue: UUIDSerialize,
    parseLiteral(ast) {
      if (ast.kind !== Kind.STRING) throw new GraphQLError(`${"Datetime" ?? "This scalar"} can only parse string values (kind='${ast.kind}')`);
      return ast.value;
    }
  },
  UUID: {
    serialize: UUIDSerialize,
    parseValue(value) {
      return coerce("" + value);
    },
    parseLiteral(ast) {
      if (ast.kind !== Kind.STRING) throw new GraphQLError(`${"UUID" ?? "This scalar"} can only parse string values (kind = '${ast.kind}')`);
      return coerce(ast.value);
    }
  }
};
export const enums = {
  OrganizationGroupBy: {
    values: {
      AVATAR_URL($pgSelect) {
        $pgSelect.groupBy({
          fragment: sql.fragment`${$pgSelect.alias}.${sql.identifier("avatar_url")}`,
          codec: TYPES.text
        });
      },
      CREATED_AT($pgSelect) {
        $pgSelect.groupBy({
          fragment: sql.fragment`${$pgSelect.alias}.${sql.identifier("created_at")}`,
          codec: TYPES.timestamptz
        });
      },
      CREATED_AT_TRUNCATED_TO_DAY($pgSelect) {
        $pgSelect.groupBy({
          fragment: aggregateGroupBySpec2.sqlWrap(sql`${$pgSelect.alias}.${sql.identifier("created_at")}`),
          codec: aggregateGroupBySpec2.sqlWrapCodec(TYPES.timestamptz)
        });
      },
      CREATED_AT_TRUNCATED_TO_HOUR($pgSelect) {
        $pgSelect.groupBy({
          fragment: aggregateGroupBySpec.sqlWrap(sql`${$pgSelect.alias}.${sql.identifier("created_at")}`),
          codec: aggregateGroupBySpec.sqlWrapCodec(TYPES.timestamptz)
        });
      },
      DESCRIPTION($pgSelect) {
        $pgSelect.groupBy({
          fragment: sql.fragment`${$pgSelect.alias}.${sql.identifier("description")}`,
          codec: TYPES.text
        });
      },
      NAME($pgSelect) {
        $pgSelect.groupBy({
          fragment: sql.fragment`${$pgSelect.alias}.${sql.identifier("name")}`,
          codec: TYPES.text
        });
      },
      STRIPE_CUSTOMER_ID($pgSelect) {
        $pgSelect.groupBy({
          fragment: sql.fragment`${$pgSelect.alias}.${sql.identifier("stripe_customer_id")}`,
          codec: TYPES.text
        });
      },
      STRIPE_SUBSCRIPTION_ID($pgSelect) {
        $pgSelect.groupBy({
          fragment: sql.fragment`${$pgSelect.alias}.${sql.identifier("stripe_subscription_id")}`,
          codec: TYPES.text
        });
      },
      TIER($pgSelect) {
        $pgSelect.groupBy({
          fragment: sql.fragment`${$pgSelect.alias}.${sql.identifier("tier")}`,
          codec: tierCodec
        });
      },
      UPDATED_AT($pgSelect) {
        $pgSelect.groupBy({
          fragment: sql.fragment`${$pgSelect.alias}.${sql.identifier("updated_at")}`,
          codec: TYPES.timestamptz
        });
      },
      UPDATED_AT_TRUNCATED_TO_DAY($pgSelect) {
        $pgSelect.groupBy({
          fragment: aggregateGroupBySpec2.sqlWrap(sql`${$pgSelect.alias}.${sql.identifier("updated_at")}`),
          codec: aggregateGroupBySpec2.sqlWrapCodec(TYPES.timestamptz)
        });
      },
      UPDATED_AT_TRUNCATED_TO_HOUR($pgSelect) {
        $pgSelect.groupBy({
          fragment: aggregateGroupBySpec.sqlWrap(sql`${$pgSelect.alias}.${sql.identifier("updated_at")}`),
          codec: aggregateGroupBySpec.sqlWrapCodec(TYPES.timestamptz)
        });
      }
    }
  },
  OrganizationMemberGroupBy: {
    values: {
      CREATED_AT($pgSelect) {
        $pgSelect.groupBy({
          fragment: sql.fragment`${$pgSelect.alias}.${sql.identifier("created_at")}`,
          codec: TYPES.timestamptz
        });
      },
      CREATED_AT_TRUNCATED_TO_DAY($pgSelect) {
        $pgSelect.groupBy({
          fragment: aggregateGroupBySpec2.sqlWrap(sql`${$pgSelect.alias}.${sql.identifier("created_at")}`),
          codec: aggregateGroupBySpec2.sqlWrapCodec(TYPES.timestamptz)
        });
      },
      CREATED_AT_TRUNCATED_TO_HOUR($pgSelect) {
        $pgSelect.groupBy({
          fragment: aggregateGroupBySpec.sqlWrap(sql`${$pgSelect.alias}.${sql.identifier("created_at")}`),
          codec: aggregateGroupBySpec.sqlWrapCodec(TYPES.timestamptz)
        });
      },
      ORGANIZATION_ID($pgSelect) {
        $pgSelect.groupBy({
          fragment: sql.fragment`${$pgSelect.alias}.${sql.identifier("organization_id")}`,
          codec: TYPES.uuid
        });
      },
      ROLE($pgSelect) {
        $pgSelect.groupBy({
          fragment: sql.fragment`${$pgSelect.alias}.${sql.identifier("role")}`,
          codec: roleCodec
        });
      },
      UPDATED_AT($pgSelect) {
        $pgSelect.groupBy({
          fragment: sql.fragment`${$pgSelect.alias}.${sql.identifier("updated_at")}`,
          codec: TYPES.timestamptz
        });
      },
      UPDATED_AT_TRUNCATED_TO_DAY($pgSelect) {
        $pgSelect.groupBy({
          fragment: aggregateGroupBySpec2.sqlWrap(sql`${$pgSelect.alias}.${sql.identifier("updated_at")}`),
          codec: aggregateGroupBySpec2.sqlWrapCodec(TYPES.timestamptz)
        });
      },
      UPDATED_AT_TRUNCATED_TO_HOUR($pgSelect) {
        $pgSelect.groupBy({
          fragment: aggregateGroupBySpec.sqlWrap(sql`${$pgSelect.alias}.${sql.identifier("updated_at")}`),
          codec: aggregateGroupBySpec.sqlWrapCodec(TYPES.timestamptz)
        });
      },
      USER_ID($pgSelect) {
        $pgSelect.groupBy({
          fragment: sql.fragment`${$pgSelect.alias}.${sql.identifier("user_id")}`,
          codec: TYPES.uuid
        });
      }
    }
  },
  OrganizationMemberOrderBy: {
    values: {
      CREATED_AT_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "created_at",
          direction: "ASC"
        });
      },
      CREATED_AT_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "created_at",
          direction: "DESC"
        });
      },
      ORGANIZATION_ID_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "organization_id",
          direction: "ASC"
        });
        queryBuilder.setOrderIsUnique();
      },
      ORGANIZATION_ID_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "organization_id",
          direction: "DESC"
        });
        queryBuilder.setOrderIsUnique();
      },
      PRIMARY_KEY_ASC(queryBuilder) {
        organization_memberUniques[0].attributes.forEach(attributeName => {
          queryBuilder.orderBy({
            attribute: attributeName,
            direction: "ASC"
          });
        });
        queryBuilder.setOrderIsUnique();
      },
      PRIMARY_KEY_DESC(queryBuilder) {
        organization_memberUniques[0].attributes.forEach(attributeName => {
          queryBuilder.orderBy({
            attribute: attributeName,
            direction: "DESC"
          });
        });
        queryBuilder.setOrderIsUnique();
      },
      ROLE_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "role",
          direction: "ASC"
        });
      },
      ROLE_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "role",
          direction: "DESC"
        });
      },
      UPDATED_AT_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "updated_at",
          direction: "ASC"
        });
      },
      UPDATED_AT_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "updated_at",
          direction: "DESC"
        });
      },
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
  OrganizationOrderBy: {
    values: {
      AVATAR_URL_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "avatar_url",
          direction: "ASC"
        });
      },
      AVATAR_URL_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "avatar_url",
          direction: "DESC"
        });
      },
      CREATED_AT_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "created_at",
          direction: "ASC"
        });
      },
      CREATED_AT_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "created_at",
          direction: "DESC"
        });
      },
      DESCRIPTION_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "description",
          direction: "ASC"
        });
      },
      DESCRIPTION_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "description",
          direction: "DESC"
        });
      },
      NAME_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "name",
          direction: "ASC"
        });
      },
      NAME_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "name",
          direction: "DESC"
        });
      },
      ORGANIZATION_MEMBERS_COUNT_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_organization_memberPgResource.name));
        relation5.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation5.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_organization_memberPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`select count(*)
from ${resource_organization_memberPgResource.from} ${tableAlias}
where ${sql.parens(sql.join(conditions.map(c => sql.parens(c)), " AND "))}`})`;
        $select.orderBy({
          fragment,
          codec: TYPES.bigint,
          direction: "ASC"
        });
      },
      ORGANIZATION_MEMBERS_COUNT_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_organization_memberPgResource.name));
        relation5.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation5.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_organization_memberPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`select count(*)
from ${resource_organization_memberPgResource.from} ${tableAlias}
where ${sql.parens(sql.join(conditions.map(c => sql.parens(c)), " AND "))}`})`;
        $select.orderBy({
          fragment,
          codec: TYPES.bigint,
          direction: "DESC"
        });
      },
      ORGANIZATION_MEMBERS_DISTINCT_COUNT_CREATED_AT_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_organization_memberPgResource.name));
        relation5.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation5.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_organization_memberPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("created_at")}`, spec_organizationMember.attributes.created_at.codec)}
from ${resource_organization_memberPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_organizationMember.attributes.created_at.codec) ?? spec_organizationMember.attributes.created_at.codec,
          direction: "ASC"
        });
      },
      ORGANIZATION_MEMBERS_DISTINCT_COUNT_CREATED_AT_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_organization_memberPgResource.name));
        relation5.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation5.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_organization_memberPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("created_at")}`, spec_organizationMember.attributes.created_at.codec)}
from ${resource_organization_memberPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_organizationMember.attributes.created_at.codec) ?? spec_organizationMember.attributes.created_at.codec,
          direction: "DESC"
        });
      },
      ORGANIZATION_MEMBERS_DISTINCT_COUNT_ORGANIZATION_ID_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_organization_memberPgResource.name));
        relation5.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation5.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_organization_memberPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("organization_id")}`, spec_organizationMember.attributes.organization_id.codec)}
from ${resource_organization_memberPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_organizationMember.attributes.organization_id.codec) ?? spec_organizationMember.attributes.organization_id.codec,
          direction: "ASC"
        });
      },
      ORGANIZATION_MEMBERS_DISTINCT_COUNT_ORGANIZATION_ID_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_organization_memberPgResource.name));
        relation5.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation5.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_organization_memberPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("organization_id")}`, spec_organizationMember.attributes.organization_id.codec)}
from ${resource_organization_memberPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_organizationMember.attributes.organization_id.codec) ?? spec_organizationMember.attributes.organization_id.codec,
          direction: "DESC"
        });
      },
      ORGANIZATION_MEMBERS_DISTINCT_COUNT_ROLE_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_organization_memberPgResource.name));
        relation5.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation5.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_organization_memberPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("role")}`, spec_organizationMember.attributes.role.codec)}
from ${resource_organization_memberPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_organizationMember.attributes.role.codec) ?? spec_organizationMember.attributes.role.codec,
          direction: "ASC"
        });
      },
      ORGANIZATION_MEMBERS_DISTINCT_COUNT_ROLE_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_organization_memberPgResource.name));
        relation5.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation5.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_organization_memberPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("role")}`, spec_organizationMember.attributes.role.codec)}
from ${resource_organization_memberPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_organizationMember.attributes.role.codec) ?? spec_organizationMember.attributes.role.codec,
          direction: "DESC"
        });
      },
      ORGANIZATION_MEMBERS_DISTINCT_COUNT_UPDATED_AT_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_organization_memberPgResource.name));
        relation5.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation5.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_organization_memberPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("updated_at")}`, spec_organizationMember.attributes.updated_at.codec)}
from ${resource_organization_memberPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_organizationMember.attributes.updated_at.codec) ?? spec_organizationMember.attributes.updated_at.codec,
          direction: "ASC"
        });
      },
      ORGANIZATION_MEMBERS_DISTINCT_COUNT_UPDATED_AT_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_organization_memberPgResource.name));
        relation5.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation5.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_organization_memberPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("updated_at")}`, spec_organizationMember.attributes.updated_at.codec)}
from ${resource_organization_memberPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_organizationMember.attributes.updated_at.codec) ?? spec_organizationMember.attributes.updated_at.codec,
          direction: "DESC"
        });
      },
      ORGANIZATION_MEMBERS_DISTINCT_COUNT_USER_ID_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_organization_memberPgResource.name));
        relation5.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation5.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_organization_memberPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("user_id")}`, spec_organizationMember.attributes.user_id.codec)}
from ${resource_organization_memberPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_organizationMember.attributes.user_id.codec) ?? spec_organizationMember.attributes.user_id.codec,
          direction: "ASC"
        });
      },
      ORGANIZATION_MEMBERS_DISTINCT_COUNT_USER_ID_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_organization_memberPgResource.name));
        relation5.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation5.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_organization_memberPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("user_id")}`, spec_organizationMember.attributes.user_id.codec)}
from ${resource_organization_memberPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_organizationMember.attributes.user_id.codec) ?? spec_organizationMember.attributes.user_id.codec,
          direction: "DESC"
        });
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
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation6.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation6.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`select count(*)
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.parens(sql.join(conditions.map(c => sql.parens(c)), " AND "))}`})`;
        $select.orderBy({
          fragment,
          codec: TYPES.bigint,
          direction: "ASC"
        });
      },
      REPOSITORIES_COUNT_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation6.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation6.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`select count(*)
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.parens(sql.join(conditions.map(c => sql.parens(c)), " AND "))}`})`;
        $select.orderBy({
          fragment,
          codec: TYPES.bigint,
          direction: "DESC"
        });
      },
      REPOSITORIES_DISTINCT_COUNT_CREATED_AT_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation6.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation6.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("created_at")}`, spec_repository.attributes.created_at.codec)}
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repository.attributes.created_at.codec) ?? spec_repository.attributes.created_at.codec,
          direction: "ASC"
        });
      },
      REPOSITORIES_DISTINCT_COUNT_CREATED_AT_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation6.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation6.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("created_at")}`, spec_repository.attributes.created_at.codec)}
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repository.attributes.created_at.codec) ?? spec_repository.attributes.created_at.codec,
          direction: "DESC"
        });
      },
      REPOSITORIES_DISTINCT_COUNT_DEFAULT_BRANCH_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation6.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation6.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("default_branch")}`, spec_repository.attributes.default_branch.codec)}
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repository.attributes.default_branch.codec) ?? spec_repository.attributes.default_branch.codec,
          direction: "ASC"
        });
      },
      REPOSITORIES_DISTINCT_COUNT_DEFAULT_BRANCH_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation6.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation6.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("default_branch")}`, spec_repository.attributes.default_branch.codec)}
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repository.attributes.default_branch.codec) ?? spec_repository.attributes.default_branch.codec,
          direction: "DESC"
        });
      },
      REPOSITORIES_DISTINCT_COUNT_DESCRIPTION_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation6.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation6.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("description")}`, spec_repository.attributes.description.codec)}
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repository.attributes.description.codec) ?? spec_repository.attributes.description.codec,
          direction: "ASC"
        });
      },
      REPOSITORIES_DISTINCT_COUNT_DESCRIPTION_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation6.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation6.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("description")}`, spec_repository.attributes.description.codec)}
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repository.attributes.description.codec) ?? spec_repository.attributes.description.codec,
          direction: "DESC"
        });
      },
      REPOSITORIES_DISTINCT_COUNT_NAME_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation6.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation6.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("name")}`, spec_repository.attributes.name.codec)}
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repository.attributes.name.codec) ?? spec_repository.attributes.name.codec,
          direction: "ASC"
        });
      },
      REPOSITORIES_DISTINCT_COUNT_NAME_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation6.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation6.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("name")}`, spec_repository.attributes.name.codec)}
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repository.attributes.name.codec) ?? spec_repository.attributes.name.codec,
          direction: "DESC"
        });
      },
      REPOSITORIES_DISTINCT_COUNT_ORGANIZATION_ID_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation6.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation6.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("organization_id")}`, spec_repository.attributes.organization_id.codec)}
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repository.attributes.organization_id.codec) ?? spec_repository.attributes.organization_id.codec,
          direction: "ASC"
        });
      },
      REPOSITORIES_DISTINCT_COUNT_ORGANIZATION_ID_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation6.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation6.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("organization_id")}`, spec_repository.attributes.organization_id.codec)}
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repository.attributes.organization_id.codec) ?? spec_repository.attributes.organization_id.codec,
          direction: "DESC"
        });
      },
      REPOSITORIES_DISTINCT_COUNT_OWNER_ID_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation6.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation6.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("owner_id")}`, spec_repository.attributes.owner_id.codec)}
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repository.attributes.owner_id.codec) ?? spec_repository.attributes.owner_id.codec,
          direction: "ASC"
        });
      },
      REPOSITORIES_DISTINCT_COUNT_OWNER_ID_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation6.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation6.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("owner_id")}`, spec_repository.attributes.owner_id.codec)}
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repository.attributes.owner_id.codec) ?? spec_repository.attributes.owner_id.codec,
          direction: "DESC"
        });
      },
      REPOSITORIES_DISTINCT_COUNT_ROW_ID_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation6.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation6.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("id")}`, spec_repository.attributes.id.codec)}
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repository.attributes.id.codec) ?? spec_repository.attributes.id.codec,
          direction: "ASC"
        });
      },
      REPOSITORIES_DISTINCT_COUNT_ROW_ID_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation6.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation6.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("id")}`, spec_repository.attributes.id.codec)}
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repository.attributes.id.codec) ?? spec_repository.attributes.id.codec,
          direction: "DESC"
        });
      },
      REPOSITORIES_DISTINCT_COUNT_SLUG_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation6.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation6.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("slug")}`, spec_repository.attributes.slug.codec)}
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repository.attributes.slug.codec) ?? spec_repository.attributes.slug.codec,
          direction: "ASC"
        });
      },
      REPOSITORIES_DISTINCT_COUNT_SLUG_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation6.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation6.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("slug")}`, spec_repository.attributes.slug.codec)}
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repository.attributes.slug.codec) ?? spec_repository.attributes.slug.codec,
          direction: "DESC"
        });
      },
      REPOSITORIES_DISTINCT_COUNT_UPDATED_AT_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation6.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation6.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("updated_at")}`, spec_repository.attributes.updated_at.codec)}
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repository.attributes.updated_at.codec) ?? spec_repository.attributes.updated_at.codec,
          direction: "ASC"
        });
      },
      REPOSITORIES_DISTINCT_COUNT_UPDATED_AT_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation6.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation6.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("updated_at")}`, spec_repository.attributes.updated_at.codec)}
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repository.attributes.updated_at.codec) ?? spec_repository.attributes.updated_at.codec,
          direction: "DESC"
        });
      },
      REPOSITORIES_DISTINCT_COUNT_VISIBILITY_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation6.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation6.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("visibility")}`, spec_repository.attributes.visibility.codec)}
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repository.attributes.visibility.codec) ?? spec_repository.attributes.visibility.codec,
          direction: "ASC"
        });
      },
      REPOSITORIES_DISTINCT_COUNT_VISIBILITY_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation6.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation6.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("visibility")}`, spec_repository.attributes.visibility.codec)}
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repository.attributes.visibility.codec) ?? spec_repository.attributes.visibility.codec,
          direction: "DESC"
        });
      },
      ROW_ID_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "id",
          direction: "ASC"
        });
        queryBuilder.setOrderIsUnique();
      },
      ROW_ID_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "id",
          direction: "DESC"
        });
        queryBuilder.setOrderIsUnique();
      },
      SLUG_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "slug",
          direction: "ASC"
        });
        queryBuilder.setOrderIsUnique();
      },
      SLUG_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "slug",
          direction: "DESC"
        });
        queryBuilder.setOrderIsUnique();
      },
      STRIPE_CUSTOMER_ID_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "stripe_customer_id",
          direction: "ASC"
        });
      },
      STRIPE_CUSTOMER_ID_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "stripe_customer_id",
          direction: "DESC"
        });
      },
      STRIPE_SUBSCRIPTION_ID_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "stripe_subscription_id",
          direction: "ASC"
        });
      },
      STRIPE_SUBSCRIPTION_ID_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "stripe_subscription_id",
          direction: "DESC"
        });
      },
      TIER_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "tier",
          direction: "ASC"
        });
      },
      TIER_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "tier",
          direction: "DESC"
        });
      },
      UPDATED_AT_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "updated_at",
          direction: "ASC"
        });
      },
      UPDATED_AT_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "updated_at",
          direction: "DESC"
        });
      }
    }
  },
  RepositoryCollaboratorGroupBy: {
    values: {
      CREATED_AT($pgSelect) {
        $pgSelect.groupBy({
          fragment: sql.fragment`${$pgSelect.alias}.${sql.identifier("created_at")}`,
          codec: TYPES.timestamptz
        });
      },
      CREATED_AT_TRUNCATED_TO_DAY($pgSelect) {
        $pgSelect.groupBy({
          fragment: aggregateGroupBySpec2.sqlWrap(sql`${$pgSelect.alias}.${sql.identifier("created_at")}`),
          codec: aggregateGroupBySpec2.sqlWrapCodec(TYPES.timestamptz)
        });
      },
      CREATED_AT_TRUNCATED_TO_HOUR($pgSelect) {
        $pgSelect.groupBy({
          fragment: aggregateGroupBySpec.sqlWrap(sql`${$pgSelect.alias}.${sql.identifier("created_at")}`),
          codec: aggregateGroupBySpec.sqlWrapCodec(TYPES.timestamptz)
        });
      },
      PERMISSION($pgSelect) {
        $pgSelect.groupBy({
          fragment: sql.fragment`${$pgSelect.alias}.${sql.identifier("permission")}`,
          codec: permissionCodec
        });
      },
      REPOSITORY_ID($pgSelect) {
        $pgSelect.groupBy({
          fragment: sql.fragment`${$pgSelect.alias}.${sql.identifier("repository_id")}`,
          codec: TYPES.uuid
        });
      },
      UPDATED_AT($pgSelect) {
        $pgSelect.groupBy({
          fragment: sql.fragment`${$pgSelect.alias}.${sql.identifier("updated_at")}`,
          codec: TYPES.timestamptz
        });
      },
      UPDATED_AT_TRUNCATED_TO_DAY($pgSelect) {
        $pgSelect.groupBy({
          fragment: aggregateGroupBySpec2.sqlWrap(sql`${$pgSelect.alias}.${sql.identifier("updated_at")}`),
          codec: aggregateGroupBySpec2.sqlWrapCodec(TYPES.timestamptz)
        });
      },
      UPDATED_AT_TRUNCATED_TO_HOUR($pgSelect) {
        $pgSelect.groupBy({
          fragment: aggregateGroupBySpec.sqlWrap(sql`${$pgSelect.alias}.${sql.identifier("updated_at")}`),
          codec: aggregateGroupBySpec.sqlWrapCodec(TYPES.timestamptz)
        });
      },
      USER_ID($pgSelect) {
        $pgSelect.groupBy({
          fragment: sql.fragment`${$pgSelect.alias}.${sql.identifier("user_id")}`,
          codec: TYPES.uuid
        });
      }
    }
  },
  RepositoryCollaboratorOrderBy: {
    values: {
      CREATED_AT_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "created_at",
          direction: "ASC"
        });
      },
      CREATED_AT_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "created_at",
          direction: "DESC"
        });
      },
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
      UPDATED_AT_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "updated_at",
          direction: "ASC"
        });
      },
      UPDATED_AT_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "updated_at",
          direction: "DESC"
        });
      },
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
      CREATED_AT($pgSelect) {
        $pgSelect.groupBy({
          fragment: sql.fragment`${$pgSelect.alias}.${sql.identifier("created_at")}`,
          codec: TYPES.timestamptz
        });
      },
      CREATED_AT_TRUNCATED_TO_DAY($pgSelect) {
        $pgSelect.groupBy({
          fragment: aggregateGroupBySpec2.sqlWrap(sql`${$pgSelect.alias}.${sql.identifier("created_at")}`),
          codec: aggregateGroupBySpec2.sqlWrapCodec(TYPES.timestamptz)
        });
      },
      CREATED_AT_TRUNCATED_TO_HOUR($pgSelect) {
        $pgSelect.groupBy({
          fragment: aggregateGroupBySpec.sqlWrap(sql`${$pgSelect.alias}.${sql.identifier("created_at")}`),
          codec: aggregateGroupBySpec.sqlWrapCodec(TYPES.timestamptz)
        });
      },
      DEFAULT_BRANCH($pgSelect) {
        $pgSelect.groupBy({
          fragment: sql.fragment`${$pgSelect.alias}.${sql.identifier("default_branch")}`,
          codec: TYPES.text
        });
      },
      DESCRIPTION($pgSelect) {
        $pgSelect.groupBy({
          fragment: sql.fragment`${$pgSelect.alias}.${sql.identifier("description")}`,
          codec: TYPES.text
        });
      },
      NAME($pgSelect) {
        $pgSelect.groupBy({
          fragment: sql.fragment`${$pgSelect.alias}.${sql.identifier("name")}`,
          codec: TYPES.text
        });
      },
      ORGANIZATION_ID($pgSelect) {
        $pgSelect.groupBy({
          fragment: sql.fragment`${$pgSelect.alias}.${sql.identifier("organization_id")}`,
          codec: TYPES.uuid
        });
      },
      OWNER_ID($pgSelect) {
        $pgSelect.groupBy({
          fragment: sql.fragment`${$pgSelect.alias}.${sql.identifier("owner_id")}`,
          codec: TYPES.uuid
        });
      },
      SLUG($pgSelect) {
        $pgSelect.groupBy({
          fragment: sql.fragment`${$pgSelect.alias}.${sql.identifier("slug")}`,
          codec: TYPES.text
        });
      },
      UPDATED_AT($pgSelect) {
        $pgSelect.groupBy({
          fragment: sql.fragment`${$pgSelect.alias}.${sql.identifier("updated_at")}`,
          codec: TYPES.timestamptz
        });
      },
      UPDATED_AT_TRUNCATED_TO_DAY($pgSelect) {
        $pgSelect.groupBy({
          fragment: aggregateGroupBySpec2.sqlWrap(sql`${$pgSelect.alias}.${sql.identifier("updated_at")}`),
          codec: aggregateGroupBySpec2.sqlWrapCodec(TYPES.timestamptz)
        });
      },
      UPDATED_AT_TRUNCATED_TO_HOUR($pgSelect) {
        $pgSelect.groupBy({
          fragment: aggregateGroupBySpec.sqlWrap(sql`${$pgSelect.alias}.${sql.identifier("updated_at")}`),
          codec: aggregateGroupBySpec.sqlWrapCodec(TYPES.timestamptz)
        });
      },
      VISIBILITY($pgSelect) {
        $pgSelect.groupBy({
          fragment: sql.fragment`${$pgSelect.alias}.${sql.identifier("visibility")}`,
          codec: visibilityCodec
        });
      }
    }
  },
  RepositoryOrderBy: {
    values: {
      CREATED_AT_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "created_at",
          direction: "ASC"
        });
      },
      CREATED_AT_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "created_at",
          direction: "DESC"
        });
      },
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
      DESCRIPTION_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "description",
          direction: "ASC"
        });
      },
      DESCRIPTION_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "description",
          direction: "DESC"
        });
      },
      NAME_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "name",
          direction: "ASC"
        });
      },
      NAME_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "name",
          direction: "DESC"
        });
      },
      ORGANIZATION_ID_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "organization_id",
          direction: "ASC"
        });
      },
      ORGANIZATION_ID_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "organization_id",
          direction: "DESC"
        });
      },
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
      REPOSITORY_COLLABORATORS_COUNT_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repository_collaboratorPgResource.name));
        relation.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repository_collaboratorPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`select count(*)
from ${resource_repository_collaboratorPgResource.from} ${tableAlias}
where ${sql.parens(sql.join(conditions.map(c => sql.parens(c)), " AND "))}`})`;
        $select.orderBy({
          fragment,
          codec: TYPES.bigint,
          direction: "ASC"
        });
      },
      REPOSITORY_COLLABORATORS_COUNT_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repository_collaboratorPgResource.name));
        relation.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repository_collaboratorPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`select count(*)
from ${resource_repository_collaboratorPgResource.from} ${tableAlias}
where ${sql.parens(sql.join(conditions.map(c => sql.parens(c)), " AND "))}`})`;
        $select.orderBy({
          fragment,
          codec: TYPES.bigint,
          direction: "DESC"
        });
      },
      REPOSITORY_COLLABORATORS_DISTINCT_COUNT_CREATED_AT_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repository_collaboratorPgResource.name));
        relation.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repository_collaboratorPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("created_at")}`, spec_repositoryCollaborator.attributes.created_at.codec)}
from ${resource_repository_collaboratorPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repositoryCollaborator.attributes.created_at.codec) ?? spec_repositoryCollaborator.attributes.created_at.codec,
          direction: "ASC"
        });
      },
      REPOSITORY_COLLABORATORS_DISTINCT_COUNT_CREATED_AT_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repository_collaboratorPgResource.name));
        relation.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repository_collaboratorPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("created_at")}`, spec_repositoryCollaborator.attributes.created_at.codec)}
from ${resource_repository_collaboratorPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repositoryCollaborator.attributes.created_at.codec) ?? spec_repositoryCollaborator.attributes.created_at.codec,
          direction: "DESC"
        });
      },
      REPOSITORY_COLLABORATORS_DISTINCT_COUNT_PERMISSION_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repository_collaboratorPgResource.name));
        relation.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repository_collaboratorPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("permission")}`, spec_repositoryCollaborator.attributes.permission.codec)}
from ${resource_repository_collaboratorPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repositoryCollaborator.attributes.permission.codec) ?? spec_repositoryCollaborator.attributes.permission.codec,
          direction: "ASC"
        });
      },
      REPOSITORY_COLLABORATORS_DISTINCT_COUNT_PERMISSION_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repository_collaboratorPgResource.name));
        relation.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repository_collaboratorPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("permission")}`, spec_repositoryCollaborator.attributes.permission.codec)}
from ${resource_repository_collaboratorPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repositoryCollaborator.attributes.permission.codec) ?? spec_repositoryCollaborator.attributes.permission.codec,
          direction: "DESC"
        });
      },
      REPOSITORY_COLLABORATORS_DISTINCT_COUNT_REPOSITORY_ID_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repository_collaboratorPgResource.name));
        relation.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repository_collaboratorPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("repository_id")}`, spec_repositoryCollaborator.attributes.repository_id.codec)}
from ${resource_repository_collaboratorPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repositoryCollaborator.attributes.repository_id.codec) ?? spec_repositoryCollaborator.attributes.repository_id.codec,
          direction: "ASC"
        });
      },
      REPOSITORY_COLLABORATORS_DISTINCT_COUNT_REPOSITORY_ID_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repository_collaboratorPgResource.name));
        relation.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repository_collaboratorPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("repository_id")}`, spec_repositoryCollaborator.attributes.repository_id.codec)}
from ${resource_repository_collaboratorPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repositoryCollaborator.attributes.repository_id.codec) ?? spec_repositoryCollaborator.attributes.repository_id.codec,
          direction: "DESC"
        });
      },
      REPOSITORY_COLLABORATORS_DISTINCT_COUNT_UPDATED_AT_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repository_collaboratorPgResource.name));
        relation.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repository_collaboratorPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("updated_at")}`, spec_repositoryCollaborator.attributes.updated_at.codec)}
from ${resource_repository_collaboratorPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repositoryCollaborator.attributes.updated_at.codec) ?? spec_repositoryCollaborator.attributes.updated_at.codec,
          direction: "ASC"
        });
      },
      REPOSITORY_COLLABORATORS_DISTINCT_COUNT_UPDATED_AT_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repository_collaboratorPgResource.name));
        relation.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repository_collaboratorPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("updated_at")}`, spec_repositoryCollaborator.attributes.updated_at.codec)}
from ${resource_repository_collaboratorPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repositoryCollaborator.attributes.updated_at.codec) ?? spec_repositoryCollaborator.attributes.updated_at.codec,
          direction: "DESC"
        });
      },
      REPOSITORY_COLLABORATORS_DISTINCT_COUNT_USER_ID_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repository_collaboratorPgResource.name));
        relation.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repository_collaboratorPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("user_id")}`, spec_repositoryCollaborator.attributes.user_id.codec)}
from ${resource_repository_collaboratorPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repositoryCollaborator.attributes.user_id.codec) ?? spec_repositoryCollaborator.attributes.user_id.codec,
          direction: "ASC"
        });
      },
      REPOSITORY_COLLABORATORS_DISTINCT_COUNT_USER_ID_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repository_collaboratorPgResource.name));
        relation.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repository_collaboratorPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("user_id")}`, spec_repositoryCollaborator.attributes.user_id.codec)}
from ${resource_repository_collaboratorPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repositoryCollaborator.attributes.user_id.codec) ?? spec_repositoryCollaborator.attributes.user_id.codec,
          direction: "DESC"
        });
      },
      ROW_ID_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "id",
          direction: "ASC"
        });
        queryBuilder.setOrderIsUnique();
      },
      ROW_ID_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "id",
          direction: "DESC"
        });
        queryBuilder.setOrderIsUnique();
      },
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
      UPDATED_AT_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "updated_at",
          direction: "ASC"
        });
      },
      UPDATED_AT_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "updated_at",
          direction: "DESC"
        });
      },
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
  UserGroupBy: {
    values: {
      AVATAR_URL($pgSelect) {
        $pgSelect.groupBy({
          fragment: sql.fragment`${$pgSelect.alias}.${sql.identifier("avatar_url")}`,
          codec: TYPES.text
        });
      },
      BIO($pgSelect) {
        $pgSelect.groupBy({
          fragment: sql.fragment`${$pgSelect.alias}.${sql.identifier("bio")}`,
          codec: TYPES.text
        });
      },
      CREATED_AT($pgSelect) {
        $pgSelect.groupBy({
          fragment: sql.fragment`${$pgSelect.alias}.${sql.identifier("created_at")}`,
          codec: TYPES.timestamptz
        });
      },
      CREATED_AT_TRUNCATED_TO_DAY($pgSelect) {
        $pgSelect.groupBy({
          fragment: aggregateGroupBySpec2.sqlWrap(sql`${$pgSelect.alias}.${sql.identifier("created_at")}`),
          codec: aggregateGroupBySpec2.sqlWrapCodec(TYPES.timestamptz)
        });
      },
      CREATED_AT_TRUNCATED_TO_HOUR($pgSelect) {
        $pgSelect.groupBy({
          fragment: aggregateGroupBySpec.sqlWrap(sql`${$pgSelect.alias}.${sql.identifier("created_at")}`),
          codec: aggregateGroupBySpec.sqlWrapCodec(TYPES.timestamptz)
        });
      },
      NAME($pgSelect) {
        $pgSelect.groupBy({
          fragment: sql.fragment`${$pgSelect.alias}.${sql.identifier("name")}`,
          codec: TYPES.text
        });
      },
      UPDATED_AT($pgSelect) {
        $pgSelect.groupBy({
          fragment: sql.fragment`${$pgSelect.alias}.${sql.identifier("updated_at")}`,
          codec: TYPES.timestamptz
        });
      },
      UPDATED_AT_TRUNCATED_TO_DAY($pgSelect) {
        $pgSelect.groupBy({
          fragment: aggregateGroupBySpec2.sqlWrap(sql`${$pgSelect.alias}.${sql.identifier("updated_at")}`),
          codec: aggregateGroupBySpec2.sqlWrapCodec(TYPES.timestamptz)
        });
      },
      UPDATED_AT_TRUNCATED_TO_HOUR($pgSelect) {
        $pgSelect.groupBy({
          fragment: aggregateGroupBySpec.sqlWrap(sql`${$pgSelect.alias}.${sql.identifier("updated_at")}`),
          codec: aggregateGroupBySpec.sqlWrapCodec(TYPES.timestamptz)
        });
      }
    }
  },
  UserOrderBy: {
    values: {
      AVATAR_URL_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "avatar_url",
          direction: "ASC"
        });
      },
      AVATAR_URL_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "avatar_url",
          direction: "DESC"
        });
      },
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
      CREATED_AT_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "created_at",
          direction: "ASC"
        });
      },
      CREATED_AT_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "created_at",
          direction: "DESC"
        });
      },
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
      NAME_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "name",
          direction: "ASC"
        });
      },
      NAME_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "name",
          direction: "DESC"
        });
      },
      ORGANIZATION_MEMBERS_COUNT_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_organization_memberPgResource.name));
        relation2.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation2.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_organization_memberPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`select count(*)
from ${resource_organization_memberPgResource.from} ${tableAlias}
where ${sql.parens(sql.join(conditions.map(c => sql.parens(c)), " AND "))}`})`;
        $select.orderBy({
          fragment,
          codec: TYPES.bigint,
          direction: "ASC"
        });
      },
      ORGANIZATION_MEMBERS_COUNT_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_organization_memberPgResource.name));
        relation2.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation2.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_organization_memberPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`select count(*)
from ${resource_organization_memberPgResource.from} ${tableAlias}
where ${sql.parens(sql.join(conditions.map(c => sql.parens(c)), " AND "))}`})`;
        $select.orderBy({
          fragment,
          codec: TYPES.bigint,
          direction: "DESC"
        });
      },
      ORGANIZATION_MEMBERS_DISTINCT_COUNT_CREATED_AT_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_organization_memberPgResource.name));
        relation2.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation2.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_organization_memberPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("created_at")}`, spec_organizationMember.attributes.created_at.codec)}
from ${resource_organization_memberPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_organizationMember.attributes.created_at.codec) ?? spec_organizationMember.attributes.created_at.codec,
          direction: "ASC"
        });
      },
      ORGANIZATION_MEMBERS_DISTINCT_COUNT_CREATED_AT_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_organization_memberPgResource.name));
        relation2.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation2.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_organization_memberPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("created_at")}`, spec_organizationMember.attributes.created_at.codec)}
from ${resource_organization_memberPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_organizationMember.attributes.created_at.codec) ?? spec_organizationMember.attributes.created_at.codec,
          direction: "DESC"
        });
      },
      ORGANIZATION_MEMBERS_DISTINCT_COUNT_ORGANIZATION_ID_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_organization_memberPgResource.name));
        relation2.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation2.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_organization_memberPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("organization_id")}`, spec_organizationMember.attributes.organization_id.codec)}
from ${resource_organization_memberPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_organizationMember.attributes.organization_id.codec) ?? spec_organizationMember.attributes.organization_id.codec,
          direction: "ASC"
        });
      },
      ORGANIZATION_MEMBERS_DISTINCT_COUNT_ORGANIZATION_ID_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_organization_memberPgResource.name));
        relation2.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation2.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_organization_memberPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("organization_id")}`, spec_organizationMember.attributes.organization_id.codec)}
from ${resource_organization_memberPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_organizationMember.attributes.organization_id.codec) ?? spec_organizationMember.attributes.organization_id.codec,
          direction: "DESC"
        });
      },
      ORGANIZATION_MEMBERS_DISTINCT_COUNT_ROLE_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_organization_memberPgResource.name));
        relation2.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation2.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_organization_memberPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("role")}`, spec_organizationMember.attributes.role.codec)}
from ${resource_organization_memberPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_organizationMember.attributes.role.codec) ?? spec_organizationMember.attributes.role.codec,
          direction: "ASC"
        });
      },
      ORGANIZATION_MEMBERS_DISTINCT_COUNT_ROLE_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_organization_memberPgResource.name));
        relation2.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation2.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_organization_memberPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("role")}`, spec_organizationMember.attributes.role.codec)}
from ${resource_organization_memberPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_organizationMember.attributes.role.codec) ?? spec_organizationMember.attributes.role.codec,
          direction: "DESC"
        });
      },
      ORGANIZATION_MEMBERS_DISTINCT_COUNT_UPDATED_AT_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_organization_memberPgResource.name));
        relation2.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation2.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_organization_memberPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("updated_at")}`, spec_organizationMember.attributes.updated_at.codec)}
from ${resource_organization_memberPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_organizationMember.attributes.updated_at.codec) ?? spec_organizationMember.attributes.updated_at.codec,
          direction: "ASC"
        });
      },
      ORGANIZATION_MEMBERS_DISTINCT_COUNT_UPDATED_AT_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_organization_memberPgResource.name));
        relation2.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation2.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_organization_memberPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("updated_at")}`, spec_organizationMember.attributes.updated_at.codec)}
from ${resource_organization_memberPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_organizationMember.attributes.updated_at.codec) ?? spec_organizationMember.attributes.updated_at.codec,
          direction: "DESC"
        });
      },
      ORGANIZATION_MEMBERS_DISTINCT_COUNT_USER_ID_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_organization_memberPgResource.name));
        relation2.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation2.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_organization_memberPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("user_id")}`, spec_organizationMember.attributes.user_id.codec)}
from ${resource_organization_memberPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_organizationMember.attributes.user_id.codec) ?? spec_organizationMember.attributes.user_id.codec,
          direction: "ASC"
        });
      },
      ORGANIZATION_MEMBERS_DISTINCT_COUNT_USER_ID_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_organization_memberPgResource.name));
        relation2.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation2.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_organization_memberPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("user_id")}`, spec_organizationMember.attributes.user_id.codec)}
from ${resource_organization_memberPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_organizationMember.attributes.user_id.codec) ?? spec_organizationMember.attributes.user_id.codec,
          direction: "DESC"
        });
      },
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
      REPOSITORIES_BY_OWNER_ID_COUNT_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation3.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation3.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`select count(*)
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.parens(sql.join(conditions.map(c => sql.parens(c)), " AND "))}`})`;
        $select.orderBy({
          fragment,
          codec: TYPES.bigint,
          direction: "ASC"
        });
      },
      REPOSITORIES_BY_OWNER_ID_COUNT_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation3.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation3.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`select count(*)
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.parens(sql.join(conditions.map(c => sql.parens(c)), " AND "))}`})`;
        $select.orderBy({
          fragment,
          codec: TYPES.bigint,
          direction: "DESC"
        });
      },
      REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_CREATED_AT_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation3.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation3.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("created_at")}`, spec_repository.attributes.created_at.codec)}
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repository.attributes.created_at.codec) ?? spec_repository.attributes.created_at.codec,
          direction: "ASC"
        });
      },
      REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_CREATED_AT_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation3.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation3.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("created_at")}`, spec_repository.attributes.created_at.codec)}
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repository.attributes.created_at.codec) ?? spec_repository.attributes.created_at.codec,
          direction: "DESC"
        });
      },
      REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_DEFAULT_BRANCH_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation3.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation3.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("default_branch")}`, spec_repository.attributes.default_branch.codec)}
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repository.attributes.default_branch.codec) ?? spec_repository.attributes.default_branch.codec,
          direction: "ASC"
        });
      },
      REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_DEFAULT_BRANCH_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation3.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation3.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("default_branch")}`, spec_repository.attributes.default_branch.codec)}
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repository.attributes.default_branch.codec) ?? spec_repository.attributes.default_branch.codec,
          direction: "DESC"
        });
      },
      REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_DESCRIPTION_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation3.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation3.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("description")}`, spec_repository.attributes.description.codec)}
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repository.attributes.description.codec) ?? spec_repository.attributes.description.codec,
          direction: "ASC"
        });
      },
      REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_DESCRIPTION_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation3.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation3.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("description")}`, spec_repository.attributes.description.codec)}
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repository.attributes.description.codec) ?? spec_repository.attributes.description.codec,
          direction: "DESC"
        });
      },
      REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_NAME_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation3.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation3.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("name")}`, spec_repository.attributes.name.codec)}
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repository.attributes.name.codec) ?? spec_repository.attributes.name.codec,
          direction: "ASC"
        });
      },
      REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_NAME_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation3.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation3.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("name")}`, spec_repository.attributes.name.codec)}
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repository.attributes.name.codec) ?? spec_repository.attributes.name.codec,
          direction: "DESC"
        });
      },
      REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_ORGANIZATION_ID_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation3.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation3.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("organization_id")}`, spec_repository.attributes.organization_id.codec)}
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repository.attributes.organization_id.codec) ?? spec_repository.attributes.organization_id.codec,
          direction: "ASC"
        });
      },
      REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_ORGANIZATION_ID_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation3.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation3.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("organization_id")}`, spec_repository.attributes.organization_id.codec)}
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repository.attributes.organization_id.codec) ?? spec_repository.attributes.organization_id.codec,
          direction: "DESC"
        });
      },
      REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_OWNER_ID_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation3.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation3.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("owner_id")}`, spec_repository.attributes.owner_id.codec)}
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repository.attributes.owner_id.codec) ?? spec_repository.attributes.owner_id.codec,
          direction: "ASC"
        });
      },
      REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_OWNER_ID_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation3.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation3.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("owner_id")}`, spec_repository.attributes.owner_id.codec)}
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repository.attributes.owner_id.codec) ?? spec_repository.attributes.owner_id.codec,
          direction: "DESC"
        });
      },
      REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_ROW_ID_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation3.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation3.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("id")}`, spec_repository.attributes.id.codec)}
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repository.attributes.id.codec) ?? spec_repository.attributes.id.codec,
          direction: "ASC"
        });
      },
      REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_ROW_ID_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation3.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation3.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("id")}`, spec_repository.attributes.id.codec)}
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repository.attributes.id.codec) ?? spec_repository.attributes.id.codec,
          direction: "DESC"
        });
      },
      REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_SLUG_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation3.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation3.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("slug")}`, spec_repository.attributes.slug.codec)}
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repository.attributes.slug.codec) ?? spec_repository.attributes.slug.codec,
          direction: "ASC"
        });
      },
      REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_SLUG_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation3.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation3.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("slug")}`, spec_repository.attributes.slug.codec)}
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repository.attributes.slug.codec) ?? spec_repository.attributes.slug.codec,
          direction: "DESC"
        });
      },
      REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_UPDATED_AT_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation3.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation3.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("updated_at")}`, spec_repository.attributes.updated_at.codec)}
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repository.attributes.updated_at.codec) ?? spec_repository.attributes.updated_at.codec,
          direction: "ASC"
        });
      },
      REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_UPDATED_AT_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation3.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation3.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("updated_at")}`, spec_repository.attributes.updated_at.codec)}
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repository.attributes.updated_at.codec) ?? spec_repository.attributes.updated_at.codec,
          direction: "DESC"
        });
      },
      REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_VISIBILITY_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation3.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation3.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("visibility")}`, spec_repository.attributes.visibility.codec)}
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repository.attributes.visibility.codec) ?? spec_repository.attributes.visibility.codec,
          direction: "ASC"
        });
      },
      REPOSITORIES_BY_OWNER_ID_DISTINCT_COUNT_VISIBILITY_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repositoryPgResource.name));
        relation3.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation3.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repositoryPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("visibility")}`, spec_repository.attributes.visibility.codec)}
from ${resource_repositoryPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repository.attributes.visibility.codec) ?? spec_repository.attributes.visibility.codec,
          direction: "DESC"
        });
      },
      REPOSITORY_COLLABORATORS_COUNT_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repository_collaboratorPgResource.name));
        relation4.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation4.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repository_collaboratorPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`select count(*)
from ${resource_repository_collaboratorPgResource.from} ${tableAlias}
where ${sql.parens(sql.join(conditions.map(c => sql.parens(c)), " AND "))}`})`;
        $select.orderBy({
          fragment,
          codec: TYPES.bigint,
          direction: "ASC"
        });
      },
      REPOSITORY_COLLABORATORS_COUNT_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repository_collaboratorPgResource.name));
        relation4.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation4.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repository_collaboratorPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`select count(*)
from ${resource_repository_collaboratorPgResource.from} ${tableAlias}
where ${sql.parens(sql.join(conditions.map(c => sql.parens(c)), " AND "))}`})`;
        $select.orderBy({
          fragment,
          codec: TYPES.bigint,
          direction: "DESC"
        });
      },
      REPOSITORY_COLLABORATORS_DISTINCT_COUNT_CREATED_AT_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repository_collaboratorPgResource.name));
        relation4.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation4.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repository_collaboratorPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("created_at")}`, spec_repositoryCollaborator.attributes.created_at.codec)}
from ${resource_repository_collaboratorPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repositoryCollaborator.attributes.created_at.codec) ?? spec_repositoryCollaborator.attributes.created_at.codec,
          direction: "ASC"
        });
      },
      REPOSITORY_COLLABORATORS_DISTINCT_COUNT_CREATED_AT_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repository_collaboratorPgResource.name));
        relation4.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation4.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repository_collaboratorPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("created_at")}`, spec_repositoryCollaborator.attributes.created_at.codec)}
from ${resource_repository_collaboratorPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repositoryCollaborator.attributes.created_at.codec) ?? spec_repositoryCollaborator.attributes.created_at.codec,
          direction: "DESC"
        });
      },
      REPOSITORY_COLLABORATORS_DISTINCT_COUNT_PERMISSION_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repository_collaboratorPgResource.name));
        relation4.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation4.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repository_collaboratorPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("permission")}`, spec_repositoryCollaborator.attributes.permission.codec)}
from ${resource_repository_collaboratorPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repositoryCollaborator.attributes.permission.codec) ?? spec_repositoryCollaborator.attributes.permission.codec,
          direction: "ASC"
        });
      },
      REPOSITORY_COLLABORATORS_DISTINCT_COUNT_PERMISSION_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repository_collaboratorPgResource.name));
        relation4.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation4.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repository_collaboratorPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("permission")}`, spec_repositoryCollaborator.attributes.permission.codec)}
from ${resource_repository_collaboratorPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repositoryCollaborator.attributes.permission.codec) ?? spec_repositoryCollaborator.attributes.permission.codec,
          direction: "DESC"
        });
      },
      REPOSITORY_COLLABORATORS_DISTINCT_COUNT_REPOSITORY_ID_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repository_collaboratorPgResource.name));
        relation4.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation4.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repository_collaboratorPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("repository_id")}`, spec_repositoryCollaborator.attributes.repository_id.codec)}
from ${resource_repository_collaboratorPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repositoryCollaborator.attributes.repository_id.codec) ?? spec_repositoryCollaborator.attributes.repository_id.codec,
          direction: "ASC"
        });
      },
      REPOSITORY_COLLABORATORS_DISTINCT_COUNT_REPOSITORY_ID_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repository_collaboratorPgResource.name));
        relation4.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation4.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repository_collaboratorPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("repository_id")}`, spec_repositoryCollaborator.attributes.repository_id.codec)}
from ${resource_repository_collaboratorPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repositoryCollaborator.attributes.repository_id.codec) ?? spec_repositoryCollaborator.attributes.repository_id.codec,
          direction: "DESC"
        });
      },
      REPOSITORY_COLLABORATORS_DISTINCT_COUNT_UPDATED_AT_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repository_collaboratorPgResource.name));
        relation4.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation4.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repository_collaboratorPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("updated_at")}`, spec_repositoryCollaborator.attributes.updated_at.codec)}
from ${resource_repository_collaboratorPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repositoryCollaborator.attributes.updated_at.codec) ?? spec_repositoryCollaborator.attributes.updated_at.codec,
          direction: "ASC"
        });
      },
      REPOSITORY_COLLABORATORS_DISTINCT_COUNT_UPDATED_AT_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repository_collaboratorPgResource.name));
        relation4.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation4.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repository_collaboratorPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("updated_at")}`, spec_repositoryCollaborator.attributes.updated_at.codec)}
from ${resource_repository_collaboratorPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repositoryCollaborator.attributes.updated_at.codec) ?? spec_repositoryCollaborator.attributes.updated_at.codec,
          direction: "DESC"
        });
      },
      REPOSITORY_COLLABORATORS_DISTINCT_COUNT_USER_ID_ASC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repository_collaboratorPgResource.name));
        relation4.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation4.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repository_collaboratorPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("user_id")}`, spec_repositoryCollaborator.attributes.user_id.codec)}
from ${resource_repository_collaboratorPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repositoryCollaborator.attributes.user_id.codec) ?? spec_repositoryCollaborator.attributes.user_id.codec,
          direction: "ASC"
        });
      },
      REPOSITORY_COLLABORATORS_DISTINCT_COUNT_USER_ID_DESC($select) {
        const foreignTableAlias = $select.alias,
          conditions = [],
          tableAlias = sql.identifier(Symbol(resource_repository_collaboratorPgResource.name));
        relation4.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = relation4.remoteAttributes[i];
          conditions.push(sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`);
        });
        if (typeof resource_repository_collaboratorPgResource.from === "function") throw Error("Function source unsupported");
        const fragment = sql`(${sql.indent`
select ${spec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier("user_id")}`, spec_repositoryCollaborator.attributes.user_id.codec)}
from ${resource_repository_collaboratorPgResource.from} ${tableAlias}
where ${sql.join(conditions.map(c => sql.parens(c)), " AND ")}`})`;
        $select.orderBy({
          fragment,
          codec: spec.pgTypeCodecModifier?.(spec_repositoryCollaborator.attributes.user_id.codec) ?? spec_repositoryCollaborator.attributes.user_id.codec,
          direction: "DESC"
        });
      },
      ROW_ID_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "id",
          direction: "ASC"
        });
        queryBuilder.setOrderIsUnique();
      },
      ROW_ID_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "id",
          direction: "DESC"
        });
        queryBuilder.setOrderIsUnique();
      },
      UPDATED_AT_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "updated_at",
          direction: "ASC"
        });
      },
      UPDATED_AT_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "updated_at",
          direction: "DESC"
        });
      },
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