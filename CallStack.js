/// <reference path="extra/JSProvider.d.ts" />

"use strict";

const log = x => host.diagnostics.debugLog(x + "\n");

function addressInformation(address)
{
    const command = `!vprot ${address}`;
    const commandLines = host.namespace.Debugger.Utility.Control.ExecuteCommand(command);

    let regex = /\s+/;
    const pageProtections = commandLines.Where(line => line.includes("Protect")).First().split(regex)[2];
    const pageType = commandLines.Where(line => line.includes("Type")).First().split(regex)[2];

    return {
        pageProtections,
        pageType
    };
}

function disassembleCallSite(address)
{
    const command = `ub ${address} L1`;
    const callSite = host.namespace.Debugger.Utility.Control.ExecuteCommand(command).Last();

    let regex = /\s+/;
    let parts = callSite.split(regex);

    const callAddress = parts[0];
    const callBytes = parts[1];
    const callDisassembly = parts.slice(2).join(" ");
    
    return {
        callAddress,
        callBytes,
        callDisassembly,
    };
}

class StackFrameEntry
{
    constructor(frame, frameNumber, moduleName, functionName, instructionOffset, returnOffset)
    {
        this.__frame = frame;
        this.__frameNumber = frameNumber;
        this.__moduleName = moduleName;
        this.__functionName = functionName;
        this.__functionAddress = instructionOffset;
        this.__returnOffset = returnOffset;
    }

    get FrameIndex() 
    {
        return this.__frameNumber;
    }

    get Module() 
    {
        return this.__moduleName;
    }

    get Function() 
    {
        return this.__functionAddress;
    }

    get Offset() 
    {
        return this.__functionOffset;
    }

    get ReturnAddress()
    {
        return this.__returnOffset.toString();
    }

    get CallSiteAddress()
    {
        return disassembleCallSite(this.__returnOffset).callAddress;
    }

    get CallSiteBytes()
    {
        return disassembleCallSite(this.__returnOffset).callBytes;
    }

    get CallSiteCommand()
    {
        return disassembleCallSite(this.__returnOffset).callDisassembly;
    }

    toString()
    {
        return `${this.__moduleName}!${this.__functionName}+${this.__functionOffset}`;
    }
};

function callStack() 
{
    let stackFrameData = []

    for (let frame of host.currentThread.Stack.Frames)
    {
        stackFrameData.push(
            new StackFrameEntry(
                frame,
                frame.Attributes.FrameNumber,
                frame.Attributes.SourceInformation.Module.Symbols.Name,
                frame.Attributes.SourceInformation.FunctionName,
                frame.Attributes.InstructionOffset,
                frame.Attributes.ReturnOffset,
            )
        );
    }

    return stackFrameData;
}

function initializeScript()
{
}
