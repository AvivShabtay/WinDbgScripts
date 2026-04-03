"use strict";

const log = (x) => host.diagnostics.debugLog(`${x}\n`);
const system = (x) => host.namespace.Debugger.Utility.Control.ExecuteCommand(x);
const asUint64 = (x) => host.evaluateExpression(`(unsigned __int64) 0x${x}`);
const read64 = (x) => host.memory.readMemoryValues(x, 1, 8)[0];

function myGetSymbol(moduleName, symbolName) {
  return host.parseInt64(
    system(`x ${moduleName}!${symbolName}`)[0].split(" ")[0].replace("`", ""),
    16,
  );
}

function getCfgBitmapBase() {
  return read64(myGetSymbol("nt", "guard_icall_bitmap"));
}

/**
    Returns the address of validation bit.
*/
function getCfgEntry(address) {
  const cfgBitmapEntryAddress = asUint64(address)
    .bitwiseShiftRight(9)
    .multiply(8)
    .add(getCfgBitmapBase());

  return cfgBitmapEntryAddress;
}

class CfgInfo {
  constructor(target, cfgBitmapEntry, cfgBitmapValue, cfgPermissions) {
    this.target = target;
    this.entry = cfgBitmapEntry;
    this.entryValue = cfgBitmapValue;
    this.permissions = cfgPermissions;
  }
}

/**
    The implementation is based on `nt!_guard_dispatch_icall_no_overrides`.
    For more info checkout:
    - https://documents.trendmicro.com/assets/wp/exploring-control-flow-guard-in-windows10.pdf
    - https://dl.acm.org/doi/fullHtml/10.1145/3664476.3670432
*/
function getCfgPermissions(address) {
  const addressU64 = asUint64(address);
  const cfgEntryAddress = getCfgEntry(address);
  const cfgEntryValue = read64(cfgEntryAddress);
  const isAlignedTargetAddress = addressU64.bitwiseAnd(0xf).asNumber() === 0; // test al, 0Fh

  if (isAlignedTargetAddress) {
    const validBitEntryIndex = addressU64
      .bitwiseShiftRight(3)
      .bitwiseAnd(0x3f)
      .asNumber();
    const isValid = cfgEntryValue
      .bitwiseShiftRight(validBitEntryIndex)
      .bitwiseAnd(1)
      .asNumber();
    const permission = isValid === 1 ? "ValidAligned" : "Invalid";
    return new CfgInfo(addressU64, cfgEntryAddress, cfgEntryValue, permission);
  }

  // unaligned path:
  const entryPresentIndex = addressU64
    .bitwiseShiftRight(3)
    .bitwiseAnd(0x3f)
    .bitwiseAnd(0x3e)
    .asNumber(); // btr r10, 0

  // does any valid function start within this 16-byte window?
  const isEntryPresent = cfgEntryValue
    .bitwiseShiftRight(entryPresentIndex)
    .bitwiseAnd(1)
    .asNumber(); // bt r11, r10

  if (isEntryPresent === 0) {
    return new CfgInfo(addressU64, cfgEntryAddress, cfgEntryValue, "Invalid");
  }

  const validBitIndex = entryPresentIndex.bitwiseOr(0x1).asNumber(); // or r10,1
  const validBit = cfgEntryValue
    .bitwiseShiftRight(validBitIndex)
    .bitwiseAnd(1)
    .asNumber(); // bt r11, r10

  const permission = validBit === 1 ? "ValidUnaligned" : "Invalid";
  return new CfgInfo(addressU64, cfgEntryAddress, cfgEntryValue, permission);
}

function initializeScript() {
  return [
    new host.apiVersionSupport(1, 9),
    new host.functionAlias(getCfgPermissions, "kcfg_per"),
  ];
}
