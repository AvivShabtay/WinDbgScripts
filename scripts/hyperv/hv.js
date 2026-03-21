"use strict";

const log = (x) => host.diagnostics.debugLog(`${x}\n`);
const system = x => host.namespace.Debugger.Utility.Control.ExecuteCommand(x);
const asUint64 = x => host.evaluateExpression(`(unsigned int64) ${x}`);

// Symbol Files
const SYMBOLS_FILE_PATHS = [
    "C:\\Dev\\WinDbgScripts\\scripts\\hyperv\\VMCS.h",
    "C:\\Dev\\WinDbgScripts\\scripts\\hyperv\\EPT.h",
];
let g_isSymbolsLoaded = false;

function loadHyperVTypes() { 
    if (g_isSymbolsLoaded) {
        return;
    }

    for (let path of SYMBOLS_FILE_PATHS) {
        host.namespace.Debugger.Utility.Analysis.SyntheticTypes.ReadHeader(
            path, "hv");   
    }

    g_isSymbolsLoaded = true; // Cache
}

// For 25H2
const VMCS_OFFSET_FROM_GS_BASE = 0x2c680;
const VIRTUAL_PROCESSOR_OFFSET_FROM_GS_BASE = 0x358;
const VTL_OFFSET_FROM_VIRTUAL_PROCESSOR = 0x3c0;

// Globals
const PFN_MASK = 0xFFFFFFFFF000; // From Intel SDM Volume 3c Section 29-12.

const u8 = x => host.memory.readMemoryValues(x, 1, 1)[0];
const u16 = x => host.memory.readMemoryValues(x, 1, 2)[0];
const u32 = x => host.memory.readMemoryValues(x, 1, 4)[0];
const u64 = x => host.memory.readMemoryValues(x, 1, 8)[0];

function read64(x, phy = false) { 
    if (phy) { 
        x = host.memory.physicalAddress(x); 
    } 
    
    return host.memory.readMemoryValues(x, 1, 8)[0]; 
}

function readEptPtr() { 
    const ept_root = 0x2466a01e;
    log(host.memory.physicalAddress(ept_root));
}

function getGsBase() { 
    return host.parseInt64(system("dq gs:[0] L1")[0].split(" ")[2], 16);
}

function getCurrentVtlNumber() {
    const gsBase =  getGsBase();
    const vp_address = u64(gsBase.add(VIRTUAL_PROCESSOR_OFFSET_FROM_GS_BASE));
    const vtl_number = u8(vp_address.add(VTL_OFFSET_FROM_VIRTUAL_PROCESSOR));
    return vtl_number;
}

function getCurrentVmcs() {
    const gsBase =  getGsBase();
    const vmcs_address = u64(gsBase.add(VMCS_OFFSET_FROM_GS_BASE));

    loadHyperVTypes();
    return host.namespace.Debugger.Utility.Analysis.SyntheticTypes.CreateInstance(
        "HV_VMX_ENLIGHTENED_VMCS", vmcs_address);
}

function getCurrentEptPointer() {
    const currentVmcs = getCurrentVmcs();
    const eptRoot = currentVmcs.EptRoot;
    return eptRoot;
}

function getEptPml4() {
    const eptRoot = getCurrentEptPointer();
    return asUint64(eptRoot).bitwiseAnd(PFN_MASK);
}

class Address {
    constructor(address) {
        this.address = asUint64(address);
        this.pml4Index = this.address.bitwiseShiftRight(39).bitwiseAnd(0x1FF);
        this.pdptIndex = this.address.bitwiseShiftRight(30).bitwiseAnd(0x1FF);
        this.pdIndex = this.address.bitwiseShiftRight(21).bitwiseAnd(0x1FF);
        this.ptIndex = this.address.bitwiseShiftRight(12).bitwiseAnd(0x1FF);
        this.offsetInPhysAddressBase = this.address.bitwiseAnd(0x1FF);
    }
}

function getPdptBase(address) {
    const addressBits = new Address(address);
    const pml4Base = getEptPml4();

    let pdptBaseValue = read64(pml4Base.add(addressBits.pml4Index.multiply(8)), true);
    pdptBaseValue = pdptBaseValue.bitwiseAnd(PFN_MASK);

    return pdptBaseValue;
}

function getPdBase(address) {
    const addressBits = new Address(address);
    const pdptBase = getPdptBase(address);

    let pdBaseValue = read64(pdptBase.add(addressBits.pdptIndex.multiply(8)), true);
    pdBaseValue = pdBaseValue.bitwiseAnd(PFN_MASK);

    return pdBaseValue;
}

function getPdBase(address) {
    const addressBits = new Address(address);
    const pdptBase = getPdptBase(address);

    let pdBaseValue = read64(pdptBase.add(addressBits.pdptIndex.multiply(8)), true);
    pdBaseValue = pdBaseValue.bitwiseAnd(PFN_MASK);

    return pdBaseValue;
}

function getPdBase(address) {
    const addressBits = new Address(address);
    const pdptBase = getPdptBase(address);

    let pdBaseValue = read64(pdptBase.add(addressBits.pdptIndex.multiply(8)), true);
    pdBaseValue = pdBaseValue.bitwiseAnd(PFN_MASK);

    return pdBaseValue;
}

function getPtBase(address) {
    const addressBits = new Address(address);
    const pdBase = getPdBase(address);

    let ptBaseValue = read64(pdBase.add(addressBits.pdIndex.multiply(8)), true);
    ptBaseValue = ptBaseValue.bitwiseAnd(PFN_MASK);

    return ptBaseValue;
}

function getPte(address) {
    const addressBits = new Address(address);
    const ptBase = getPtBase(address);

    let pteValue = read64(ptBase.add(addressBits.ptIndex.multiply(8)), true);
    return pteValue;
}

class Pte {
    constructor(ptePhysAddress) {
        this.ptePhysAddress = ptePhysAddress;
        this.ptePhysAddress
    }
}

function getAddressBits(address) {
    return new Address(address);
}
