import { describe, expect } from "vitest";
import { alchemy } from "../../src/alchemy.ts";
import { destroy } from "../../src/destroy.ts";
import { createNeonApi } from "../../src/neon/api.ts";
import { NeonBranch } from "../../src/neon/index.ts";
import { NeonProject } from "../../src/neon/project.ts";
import { NeonRole } from "../../src/neon/index.ts";
import { BRANCH_PREFIX } from "../util.ts";
import "../../src/test/vitest.ts";

const api = createNeonApi();

const test = alchemy.test(import.meta, {
  prefix: BRANCH_PREFIX,
});

describe("NeonRole Resource", () => {
  const testId = `${BRANCH_PREFIX}-test-neon-role`;

  const generateRoleName = () => `test_role_${testId}`.replace(/-/g, "_");

  test("create and delete neon role", async (scope) => {
    let project: any;
    let branch: any;
    let role: any;

    try {
      project = await NeonProject(`${testId}-project`, {
        name: `Test Project ${testId}`,
        regionId: "aws-us-east-1",
        pg_version: 15,
      });

      branch = await NeonBranch(`${testId}-branch`, {
        project: project.id,
        name: `Test Branch ${testId}`,
      });

      const roleName = generateRoleName();
      role = await NeonRole(testId, {
        project: project.id,
        branch: branch.id,
        name: roleName,
      });

      expect(role).toMatchObject({
        name: roleName,
        branchId: branch.id,
        protected: expect.any(Boolean),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });

      const getResponse = await api.get(
        `/projects/${project.id}/branches/${branch.id}/roles/${roleName}`,
      );
      expect(getResponse.status).toEqual(200);

      const responseData: any = await getResponse.json();
      expect(responseData.role.name).toEqual(roleName);
    } finally {
      await destroy(scope);

      if (role?.name && project?.id && branch?.id) {
        const getDeletedResponse = await api.get(
          `/projects/${project.id}/branches/${branch.id}/roles/${role.name}`,
        );
        expect(getDeletedResponse.status).toEqual(404);
      }
    }
  });

  test("adopt existing role", async (scope) => {
    let project: any;
    let branch: any;
    let role: any;

    try {
      project = await NeonProject(`${testId}-project-adopt`, {
        name: `Test Project Adopt ${testId}`,
        regionId: "aws-us-east-1",
        pg_version: 15,
      });

      branch = await NeonBranch(`${testId}-branch-adopt`, {
        project: project.id,
        name: `Test Branch Adopt ${testId}`,
      });

      const roleName = generateRoleName();
      const createResponse = await api.post(
        `/projects/${project.id}/branches/${branch.id}/roles`,
        {
          role: { name: roleName },
        },
      );
      expect(createResponse.status).toEqual(201);
      const createdRole: any = await createResponse.json();

      role = await NeonRole(`${testId}-adopt`, {
        project: project.id,
        branch: branch.id,
        name: roleName,
        adopt: true,
      });

      expect(role).toMatchObject({
        name: createdRole.role.name,
        branchId: branch.id,
      });
    } finally {
      await destroy(scope);
    }
  });
});
