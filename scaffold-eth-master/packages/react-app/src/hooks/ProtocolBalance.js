import { useState, useCallback } from "react";
import axios from "axios";

import usePoller from "./Poller";

/*
 * We use the Zapper API to obtain the protocol balance information
 */
const apiKey = "96e0cc51-a62e-42ca-acee-910ea7d2a241"; 
export default function useProtocolBalance(protocol, address, pollTime) {
    const [protocolData, setProtocolData] = useState({"deposit": [], "claimable": []});

    const pollProtocolBalance = useCallback(
        async (protocol, address) => {
            const response = await axios.get(`https://api.zapper.fi/v1/protocols/${protocol}/balances?addresses%5B%5D=${address}&network=ethereum&api_key=${apiKey}`);
            let newProtocolData = {"deposit": [], "claimable": []};
            console.log(`Response: ${JSON.stringify(response, null, 2)}`);
            console.log(`Address: ${address}`);
            const data = response.data[address.toLowerCase()];
            console.log(`Data: ${JSON.stringify(data, null, 2)}`);
            const assets = data.products[0].assets;
            console.log(`Assets: ${JSON.stringify(assets, null, 2)}`);

            for (const asset of assets) {
                console.log(`Asset categories: ${asset.category}`);
                if (asset.category === "deposit") {
                    newProtocolData["deposit"].push(asset);
                } else if (asset.category === "claimable") {
                    newProtocolData["claimable"].push(asset);
                }
            }
            newProtocolData["totalBalance"] = data.meta.find(v => v.label === "Total");
            console.log(`Protocol data: ${JSON.stringify(newProtocolData, null, 2)}`);

            // For each asset we grab the following: 
            // - label
            // - symbol
            // - apy [for deposit]
            // - balance
            // - balanceUSD

            // For type claimable
            // - label
            // - symbol
            // - balance
            // - balanceUSD
            setProtocolData(newProtocolData);
        },
        [protocol, address]
    );

    usePoller(
        async () => {
            if (protocol && address) {
                pollProtocolBalance(protocol, address);
            }
        },
        pollTime,
        protocol && address
    );

    return protocolData
}