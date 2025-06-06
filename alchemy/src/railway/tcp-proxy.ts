import type { Context } from "../context.ts";
import { Resource } from "../resource.ts";
import type { Secret } from "../secret.ts";
import { createRailwayApi, handleRailwayDeleteError } from "./api.ts";

export interface TcpProxyProps {
  applicationPort: number;
  proxyPort?: number;
  serviceId: string;
  environmentId: string;
  apiKey?: Secret;
}

/**
 * A Railway TCP proxy provides external access to TCP services running on specific ports.
 *
 * @example
 * ```typescript
 * // Create a TCP proxy for a database service
 * const dbProxy = await TcpProxy("db-proxy", {
 *   applicationPort: 5432,
 *   serviceId: service.id,
 *   environmentId: environment.id,
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Create a TCP proxy with custom proxy port
 * const customProxy = await TcpProxy("custom-proxy", {
 *   applicationPort: 3000,
 *   proxyPort: 8080,
 *   serviceId: service.id,
 *   environmentId: environment.id,
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Create a TCP proxy for Redis with authentication
 * const redisProxy = await TcpProxy("redis-proxy", {
 *   applicationPort: 6379,
 *   serviceId: service.id,
 *   environmentId: environment.id,
 *   apiKey: secret("redis-railway-token"),
 * });
 * ```
 */

export interface TcpProxy extends Resource<"railway::TcpProxy">, TcpProxyProps {
  id: string;
  domain: string;
  createdAt: string;
  updatedAt: string;
}

export const TcpProxy = Resource(
  "railway::TcpProxy",
  async function (
    this: Context<TcpProxy>,
    _id: string,
    props: TcpProxyProps,
  ): Promise<TcpProxy> {
    const api = createRailwayApi({ apiKey: props.apiKey });

    if (this.phase === "delete") {
      try {
        if (this.output?.id) {
          await api.mutate(
            `
            mutation TcpProxyDelete($id: String!) {
              tcpProxyDelete(id: $id)
            }
            `,
            { id: this.output.id },
          );
        }
      } catch (error) {
        handleRailwayDeleteError(error, "TcpProxy", this.output?.id);
      }

      return this.destroy();
    }

    if (this.phase === "update" && this.output?.id) {
      const response = await api.query(
        `
        query TcpProxy($id: String!) {
          tcpProxy(id: $id) {
            id
            applicationPort
            proxyPort
            serviceId
            environmentId
            domain
            createdAt
            updatedAt
          }
        }
        `,
        { id: this.output.id },
      );

      const tcpProxy = response.data?.tcpProxy;
      if (!tcpProxy) {
        throw new Error("Failed to fetch Railway TCP proxy");
      }

      return this({
        id: tcpProxy.id,
        applicationPort: tcpProxy.applicationPort,
        proxyPort: tcpProxy.proxyPort,
        serviceId: tcpProxy.serviceId,
        environmentId: tcpProxy.environmentId,
        domain: tcpProxy.domain,
        createdAt: tcpProxy.createdAt,
        updatedAt: tcpProxy.updatedAt,
      });
    }

    const response = await api.mutate(
      `
      mutation TcpProxyCreate($input: TCPProxyCreateInput!) {
        tcpProxyCreate(input: $input) {
          id
          applicationPort
          proxyPort
          serviceId
          environmentId
          domain
          createdAt
          updatedAt
        }
      }
      `,
      {
        input: {
          applicationPort: props.applicationPort,
          proxyPort: props.proxyPort,
          serviceId: props.serviceId,
          environmentId: props.environmentId,
        },
      },
    );

    const tcpProxy = response.data?.tcpProxyCreate;
    if (!tcpProxy) {
      throw new Error("Failed to create Railway TCP proxy");
    }

    return this({
      id: tcpProxy.id,
      applicationPort: tcpProxy.applicationPort,
      proxyPort: tcpProxy.proxyPort,
      serviceId: tcpProxy.serviceId,
      environmentId: tcpProxy.environmentId,
      domain: tcpProxy.domain,
      createdAt: tcpProxy.createdAt,
      updatedAt: tcpProxy.updatedAt,
    });
  },
);
