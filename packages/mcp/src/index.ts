#!/usr/bin/env node
import { createMcpServer } from "./server/create-server.js";

const server = createMcpServer();

await server.start();
