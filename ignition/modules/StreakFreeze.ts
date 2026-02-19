import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseEther } from "ethers";

const StreakFreezeModule = buildModule("StreakFreeze", (m) => {
  const uri = m.getParameter(
    "uri",
    "https://framedl.xyz/api/streak-freeze/metadata/{id}.json"
  );
  const ethPrice = m.getParameter("ethPrice", parseEther("0.001"));
  const signer = m.getParameter<string>("signer");

  const streakFreeze = m.contract("StreakFreeze", [uri, ethPrice, signer]);

  return { streakFreeze };
});

export default StreakFreezeModule;
