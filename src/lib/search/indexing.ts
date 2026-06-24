import { arborIndexes, search } from "./client";

import type { SelectPullRequest } from "lib/db/schema/pullRequest.table";
import type { SelectRepository } from "lib/db/schema/repository.table";

/**
 * Document structure for repository search index.
 */
interface RepositoryDocument {
  id: string;
  organization_id: string;
  owner_id: string;
  name: string;
  description: string | null;
  visibility: string;
  created_at: string;
  updated_at: string;
}

/**
 * Document structure for issue (pull request) search index.
 */
interface IssueDocument {
  id: string;
  organization_id: string;
  repo_id: string;
  title: string;
  body: string | null;
  status: string;
  author_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Convert a repository record to a search document.
 */
function toRepositoryDocument(
  repo: SelectRepository,
  organizationId: string,
): RepositoryDocument {
  return {
    id: repo.id,
    organization_id: organizationId,
    owner_id: repo.ownerId,
    name: repo.name,
    description: repo.description,
    visibility: repo.visibility,
    created_at: repo.createdAt,
    updated_at: repo.updatedAt,
  };
}

/**
 * Index a repository document.
 */
export async function indexRepository(
  repo: SelectRepository,
  organizationId: string,
): Promise<void> {
  if (!search || !organizationId) return;

  const document = toRepositoryDocument(repo, organizationId);

  try {
    await search.addDocuments(arborIndexes.repositories.name, [document]);
  } catch (error) {
    console.error(`[Search] Failed to index repository ${repo.id}:`, error);
  }
}

/**
 * Remove a repository from the search index.
 */
export async function deleteRepositoryFromIndex(
  repositoryId: string,
): Promise<void> {
  if (!search) return;

  try {
    await search.deleteDocuments(arborIndexes.repositories.name, [
      repositoryId,
    ]);
  } catch (error) {
    console.error(
      `[Search] Failed to delete repository ${repositoryId}:`,
      error,
    );
  }
}

/**
 * Index a pull request as an issue document.
 */
export async function indexPullRequest(
  pr: SelectPullRequest,
  organizationId: string,
): Promise<void> {
  if (!search || !organizationId) return;

  const document: IssueDocument = {
    id: pr.id,
    organization_id: organizationId,
    repo_id: pr.repositoryId,
    title: pr.title,
    body: pr.description,
    status: pr.state,
    author_id: pr.authorId,
    created_at: pr.createdAt,
    updated_at: pr.updatedAt,
  };

  try {
    await search.addDocuments(arborIndexes.issues.name, [document]);
  } catch (error) {
    console.error(`[Search] Failed to index pull request ${pr.id}:`, error);
  }
}

/**
 * Remove a pull request from the search index.
 */
export async function deletePullRequestFromIndex(
  pullRequestId: string,
): Promise<void> {
  if (!search) return;

  try {
    await search.deleteDocuments(arborIndexes.issues.name, [pullRequestId]);
  } catch (error) {
    console.error(
      `[Search] Failed to delete pull request ${pullRequestId}:`,
      error,
    );
  }
}
