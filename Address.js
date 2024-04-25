/// <reference path="extra/JSProvider.d.ts" />

"use strict";

const log = (message) => host.diagnostics.debugLog(`${message}\n`);

function readByteAsHex(address)
{
    const numberOfElementToRead = 1;
    const elementSizeInArray = 1;

    let firstByte = 0;

    try 
    {
        firstByte = host.memory.readMemoryValues(address, numberOfElementToRead, elementSizeInArray)[0];
    } catch(e) {
        firstByte = null;
    }

    return firstByte;
}

class Pattern
{
    constructor(patternAsString)
    {
        this.__patternAsString = patternAsString;
        this.__patternLength = patternAsString.length / 2;
    }

    get firstByte()
    {
        return this.__getPair(0, this.__patternAsString);
    }

    *pattern()
    {
        for (let i = 0; i < this.__patternAsString.length; i += 2) 
        {
            yield {
                "index": i / 2,
                "data": this.__getPair(i, this.__patternAsString)
            };
        }
    }

    get length()
    {
        return this.__patternLength;
    }

    isMatch(address)
    {
        for (let {index, data} of this.pattern())
        {
            const currentByte = readByteAsHex(address.add(index));
            if (currentByte != data)
            {
                return false;
            }
        }

        return true;
    }

    __getPair(index, data)
    {
        return parseInt(data.slice(index, index + 2), 16);
    }
};

function findPatternInMemory(startAddress, endAddress, pattern)
{
    const isRangeBiggerEnough = (base, offset, end) => {
        return (base + offset < end);
    };

    const patternManager = new Pattern(pattern);
    const patternFirstByte = patternManager.firstByte;

    let resultAddresses = [];

    if (!isRangeBiggerEnough(startAddress, patternManager.length, endAddress))
    {
        return [];
    }

    for (let address = startAddress; address < endAddress; ++address)
    {
        const firstByte = readByteAsHex(address);
        if (firstByte != patternFirstByte)
        {
            continue;
        }

        if (!isRangeBiggerEnough(address, patternManager.length, endAddress))
        {
            continue;
        }

        if (patternManager.isMatch(address) == true)
        {
            resultAddresses.push(address.toString(16));
        }
    }

    return resultAddresses;
}

/**
    Parses the result of `!address ... -o:1` and searches for 
    a given pattern in each memory region.

    For example:
        ```
        dx @$addresses = Debugger.Utility.Control.ExecuteCommand("!address -f:PAGE_READWRITE,MEM_COMMIT,VAR, -o:1")
        
        dx @$scriptContents.scanAddresses(@$addresses, "3248F590")

        dx @$dumpBytes = (x) => Debugger.Utility.Control.ExecuteCommand("db " + x).First()
        dx -g @$scriptContents.scanAddresses(@$addresses, "3200").Select( x => @$dumpBytes(x))
        ```
*/
function scanAddresses(addresses, pattern)
{
    let resultAddresses = [];

    for (const line of addresses)
    {
        const addressData = line.split(" ");
        const startAddress = parseInt(addressData[0], 16);
        const endAddress = parseInt(addressData[1], 16);

        const result = findPatternInMemory(startAddress, endAddress, pattern);

        if (0 < result.length)
        {
            resultAddresses = [...resultAddresses, ...result];
        }
    }

    return resultAddresses;
}
