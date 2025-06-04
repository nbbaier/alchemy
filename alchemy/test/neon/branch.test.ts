import { describe, expect } from "vitest";
import { alchemy } from "../../src/alchemy.ts";
import { destroy } from "../../src/destroy.ts";
import { createNeonApi } from "../../src/neon/api.ts";
import { NeonBranch } from "../../src/neon/index.ts";
import { NeonProject } from "../../src/neon/project.ts";
import { BRANCH_PREFIX } from "../util.ts";
import "../../src/test/vitest.ts";

const api = createNeonApi();

const test = alchemy.test(import.meta, {
  prefix: BRANCH_PREFIX,
});

describe("NeonBranch Resource", () => {
  const testId = `${BRANCH_PREFIX}-test-neon-branch`;

  const generateBranchName = () => `Test Branch ${testId}-${Date.now()}`;

  test("create, update, and delete neon branch", async (scope) => {
    let project: any;
    let branch: any;

    try {
      project = await NeonProject(`${testId}-project`, {
        name: `Test Project ${testId}-${Date.now()}`,
        region_id: "aws-us-east-1",
        pg_version: 15,
      });

      const branchName = generateBranchName();
      branch = await NeonBranch(testId, {
        project_id: project.id,
        name: branchName,
      });

      expect(branch.id).toBeTruthy();
      expect(branch.name).toEqual(branchName);
      expect(branch.project_id).toEqual(project.id);
      expect(branch.current_state).toBeTruthy();
      expect(branch.created_at).toBeTruthy();
      expect(branch.updated_at).toBeTruthy();

      const getResponse = await api.get(
        `/projects/${project.id}/branches/${branch.id}`,
      );
      expect(getResponse.status).toEqual(200);

      const responseData: any = await getResponse.json();
      expect(responseData.branch.name).toEqual(branchName);

      expect(branch.current_state).toEqual("ready");

      const updatedName = `${generateBranchName()}-updated`;
      branch = await NeonBranch(testId, {
        project_id: project.id,
        name: updatedName,
      });

      expect(branch.id).toBeTruthy();
      expect(branch.name).toEqual(updatedName);

      const getUpdatedResponse = await api.get(
        `/projects/${project.id}/branches/${branch.id}`,
      );
      const updatedData: any = await getUpdatedResponse.json();
      expect(updatedData.branch.name).toEqual(updatedName);
    } finally {
      await destroy(scope);

      if (branch?.id && project?.id) {
        const getDeletedResponse = await api.get(
          `/projects/${project.id}/branches/${branch.id}`,
        );
        expect(getDeletedResponse.status).toEqual(404);
      }
    }
  });

  test("adopt existing branch", async (scope) => {
    let project: any;
    let branch: any;

    try {
      project = await NeonProject(`${testId}-project-adopt`, {
        name: `Test Project Adopt ${testId}-${Date.now()}`,
        region_id: "aws-us-east-1",
        pg_version: 15,
      });

      const branchName = generateBranchName();
      const createResponse = await api.post(
        `/projects/${project.id}/branches`,
        {
          branch: { name: branchName },
        },
      );
      expect(createResponse.status).toEqual(201);
      const createdBranch: any = await createResponse.json();

      branch = await NeonBranch(`${testId}-adopt`, {
        project_id: project.id,
        name: branchName,
        adopt: true,
      });

      expect(branch.id).toEqual(createdBranch.branch.id);
      expect(branch.name).toEqual(branchName);
      expect(branch.project_id).toEqual(project.id);
    } finally {
      await destroy(scope);
    }
  });
});
