import { describe, expect } from "vitest";
import { alchemy } from "../../src/alchemy.ts";
import { destroy } from "../../src/destroy.ts";
import { createRailwayApi, type RailwayApi } from "../../src/railway/api.ts";
import { Environment } from "../../src/railway/environment.ts";
import { Project } from "../../src/railway/project.ts";
import { Service } from "../../src/railway/service.ts";
import { TcpProxy } from "../../src/railway/tcp-proxy.ts";
import { BRANCH_PREFIX } from "../util.ts";

import "../../src/test/vitest.ts";

// GraphQL queries for tests
const GET_TCP_PROXY_QUERY = `
  query TcpProxy($id: String!) {
    tcpProxy(id: $id) {
      id
      applicationPort
      proxyPort
      serviceId
      environmentId
      domain
    }
  }
`;

const test = alchemy.test(import.meta, {
  prefix: BRANCH_PREFIX,
});

describe("TcpProxy Resource", () => {
  const testProjectId = `${BRANCH_PREFIX}-tcp-project`;
  const testEnvironmentId = `${BRANCH_PREFIX}-tcp-environment`;
  const testServiceId = `${BRANCH_PREFIX}-tcp-service`;
  const testTcpProxyId = `${BRANCH_PREFIX}-tcp-proxy`;

  test.skipIf(!!process.env.CI)(
    "create and delete TCP proxy",
    async (scope) => {
      const railwayToken = import.meta.env.RAILWAY_TOKEN;
      if (!railwayToken) {
        throw new Error("RAILWAY_TOKEN environment variable is required");
      }
      const api = createRailwayApi({ apiKey: railwayToken });
      let project: Project | undefined;
      let environment: Environment | undefined;
      let service: Service | undefined;
      let tcpProxy: TcpProxy | undefined;

      try {
        project = await Project(testProjectId, {
          name: `${BRANCH_PREFIX} TCP Proxy Test Project`,
          description: "A project for testing TCP proxies",
        });

        environment = await Environment(testEnvironmentId, {
          name: "test",
          project: project,
        });

        service = await Service(testServiceId, {
          name: "tcp-service",
          project: project,
        });

        tcpProxy = await TcpProxy(testTcpProxyId, {
          applicationPort: 3000,
          proxyPort: 8080,
          service: service,
          environment: environment,
        });

        expect(tcpProxy.id).toBeTruthy();
        expect(tcpProxy).toMatchObject({
          applicationPort: 3000,
          proxyPort: 8080,
          serviceId: service.id,
          environmentId: environment.id,
        });
        expect(tcpProxy.domain).toBeTruthy();

        const response = await api.query(GET_TCP_PROXY_QUERY, { id: tcpProxy.id });

        const railwayTcpProxy = response.data?.tcpProxy;
        expect(railwayTcpProxy).toMatchObject({
          id: tcpProxy.id,
          applicationPort: 3000,
          proxyPort: 8080,
          serviceId: service.id,
          environmentId: environment.id,
        });
      } catch (err) {
        console.log(err);
        throw err;
      } finally {
        await destroy(scope);

        if (tcpProxy?.id) {
          await assertTcpProxyDeleted(tcpProxy.id, api);
        }
      }
    },
  );
});

async function assertTcpProxyDeleted(tcpProxyId: string, api: RailwayApi) {
  try {
    const response = await api.query(GET_TCP_PROXY_QUERY, { id: tcpProxyId });

    expect(response.data?.tcpProxy).toBeNull();
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return;
    }
    throw error;
  }
}
