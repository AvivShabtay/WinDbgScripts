"use strict";

function getObjectHeader(objectAddress)
{
    const offsetFromObjectHeaderToObjectBody = host.getModuleType("nt", "_OBJECT_HEADER").fields.Body.offset;
    const objectHeaderAddress = objectAddress.subtract(offsetFromObjectHeaderToObjectBody);

    return host.createPointerObject( 
        objectHeaderAddress, 
        "nt", 
        "_OBJECT_HEADER*");
}

function getSymInf(addr)
{
    return host.getModuleContainingSymbolInformation(addr);
}

function initializeScript()
{
	class processInformation
	{
        get ObjectHeader()
        {
            return new getObjectHeader(this.targetLocation.address);
        }

        get [Symbol.metadataDescriptor]()
        {
            return {
                ObjectHeader: { Help: "Returns the _OBJECT_HEADER structure for this object.", },
            };
        }
    }

    class processInformationForDataModel
	{
        get ObjectHeader()
        {
            return new getObjectHeader(this.KernelObject.targetLocation.address);
        }

        get [Symbol.metadataDescriptor]()
        {
            return {
                ObjectHeader: { Help: "Returns the _OBJECT_HEADER structure for this object.", },
            };
        }
    }
    
    return [
        new host.typeSignatureExtension(processInformation, "_EPROCESS"),
        new host.namedModelParent(processInformationForDataModel, "Debugger.Models.Process"),
    ];
}
