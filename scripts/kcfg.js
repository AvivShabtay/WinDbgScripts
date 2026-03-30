"use strict";

const log = (x) => host.diagnostics.debugLog(`${x}\n`);
const system = x => host.namespace.Debugger.Utility.Control.ExecuteCommand(x);
const asUint64 = (x) => host.evaluateExpression(`(unsigned __int64) 0x${x}`);
const u64 = x => host.memory.readMemoryValues(x, 1, 8)[0];

function myGetSymbol(moduleName, symbolName) {
    return host.parseInt64(system(`x ${moduleName}!${symbolName}`)[0].split(" ")[0].replace('`', ""), 16);
}

const CFG_PERMISSIONS = {
    0x0: "Invalid",
    0x1: "ValidAligned",
    0x2: "ValidUnaligned",
    0x3: "ValidExportSuppressed"
};

function getCfgBitmapBase() {
    return u64(myGetSymbol("nt", "guard_icall_bitmap"));
}

function getCfgEntry(address) {
    const cfgBitmapEntryAddress = 
        asUint64(address)
        .bitwiseShiftRight(9)
        .multiply(8)
        .add(getCfgBitmapBase());

    return cfgBitmapEntryAddress;
}

class CfgInfo {
    constructor(target, cfgBitmapEntry, cfgBitmapValue, cfgPermissions){
        this.target = target;
        this.entry = cfgBitmapEntry;
        this.entryValue = cfgBitmapValue;
        this.permissions = cfgPermissions;
    }
};

/**
    References:
    - https://documents.trendmicro.com/assets/wp/exploring-control-flow-guard-in-windows10.pdf
    - https://i.blackhat.com/BH-USA-25/Presentations/USA-25-McGarr-Out-Of-Control-KCFG-And-KCET.pdf
    - https://dl.acm.org/doi/fullHtml/10.1145/3664476.3670432
*/
function getCfgPermissions(address) {
    const addressU64 = asUint64(address);
    if (!(addressU64.bitwiseAnd(0xF) == 0)) {
        throw new Error("Not supporing unaligned address");
    }

    const entryIndex = addressU64.bitwiseShiftRight(3).bitwiseAnd(0x3F);
    const cfgEntryAddress = getCfgEntry(address);
    const cfgEntryValue = u64(cfgEntryAddress);

    const permissions = CFG_PERMISSIONS[cfgEntryValue.bitwiseShiftRight(entryIndex).bitwiseAnd(1).asNumber()];
    return new CfgInfo(
        addressU64,
        cfgEntryAddress,
        cfgEntryValue,
        permissions
    );
}

function initializeScript() {
    return [
        new host.apiVersionSupport(1, 9),
        new host.functionAlias(getCfgPermissions, "kcfg_per"),
    ];
}
