// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CondominiumModule = buildModule("CondominiumModule", (m) => {

  const condominium = m.contract("Condominium", [], {});

  return { condominium };
});

export default CondominiumModule;
