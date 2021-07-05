import React, { useState, useEffect } from "react";
import axios from "axios";

import { Button, Divider } from "antd";
import Xarrow from "react-xarrows"; 

import { v4 as uuidv4 } from "uuid";
import { useInterval, useProtocolBalance } from "../hooks";
import { Round } from "../helpers";


export default function Pay({ address, userSigner, mainnetProvider, localProvider }) {
    const options = {
        headers: {
            'Authorization': 'Bearer QVBJX0tFWTo3ZDc3Zjg3MDZmZDAyODNhYjg5ZTljMzIwYjQzZDZkMjo1YWIzOWNiMTAyNGVmMTIzZjg5ODBhMjYyNWNhYTgzNg==',
        }
    }

    const [processorToken, setProcessorToken] = useState();
    const [idempotencyKey, setIdempotencyKey] = useState();

    const [formSection, setFormSection] = useState(1);

    const [completedForm, setCompletedForm] = useState(false);

    // Fetch the account balance once the user has connected their bank account 
    const fetchAccountBalance = useEffect(() => {
        if (!completedForm) {
            return;
        }
        // TODO: Figure out how to get the account balance from API


        return;
    }, [completedForm]);


    // First liquidate the claimable balances if available
    const fetchProtocolBalance = (protocol, address) => {
        // https://api.zapper.fi/v1/protocols/idle/balances?addresses%5B%5D=0x7bf57F6b9B642264f43de48942ca1aC2e937B3Ba&network=ethereum&
        // api_key=96e0cc51-a62e-42ca-acee-910ea7d2a241
        const apiKey = "96e0cc51-a62e-42ca-acee-910ea7d2a241"; 
        let protocolData = {"deposit": [], "claimable": []}; 
        axios.get(`https://api.zapper.fi/v1/protocols/${protocol}/balances?addresses%5B%5D=${address}&network=ethereum&api_key=${apiKey}`)
            .then(response => {
                console.log(`Response: ${JSON.stringify(response, null, 2)}`);
                console.log(`Address: ${address}`);
                const data = response.data[address.toLowerCase()];
                console.log(`Data: ${JSON.stringify(data, null, 2)}`);
                const assets = data.products[0].assets;
                console.log(`Assets: ${JSON.stringify(assets, null, 2)}`);

                for (const asset of assets) {
                    console.log(`Asset categories: ${asset.category}`);
                    if (asset.category === "deposit") {
                        protocolData["deposit"].push(asset);
                        console.log(`Protocol data depost: ${JSON.stringify(protocolData, null, 2)}`);
                    } else if (asset.category === "claimable") {
                        protocolData["claimable"].push(asset);
                        console.log(`Protocol data claimable: ${JSON.stringify(protocolData, null, 2)}`);
                    }
                }

                // For each asset we grab the following: 
                // - label
                // - symbol
                // - apy [for deposit]
                // - balance
                // - balanceUSD
                const meta = data.meta;

                // For type claimable
                // - label
                // - symbol
                // - balance
                // - balanceUSD
                console.log(`Fetched protocl data: ${JSON.stringify(protocolData, null, 2)}`);
                return protocolData;
            });
        
        return null; 
    } 

    const HARDCODED_ADDRESS = "0x7bf57F6b9B642264f43de48942ca1aC2e937B3Ba";
    const protocolData = useProtocolBalance("idle", HARDCODED_ADDRESS, 10000);
    console.log(`Protocol data in Pay: ${JSON.stringify(protocolData, null, 2)}`);

    const handleSubmitAccountInfo = (e) => {
        e.preventDefault();

        const accountInput = e.target.elements.account.value;
        const routingInput = e.target.elements.routing.value;
        const descriptionInput = e.target.elements.description.value;
        // const balanceInput = e.target.elements.balance.value;
        console.log(`Account value: ${accountInput}`);
        console.log(`Routing value: ${routingInput}`);
        console.log(`Description value: ${descriptionInput}`);
        // console.log(`Balance value: ${balanceInput}`);
        // console.log(`Data: ${JSON.stringify(e.target.elements, null, 2)}`);

        const balance = 100000;

        axios.post('https://api-sandbox.circle.com/v1/mocks/ach/accounts', {
            account: {
                accountNumber: accountInput,
                routingNumber: routingInput,
                description: descriptionInput
            },
            balance: {
                amount: balance, // Hardcoded for demo purposes
                currency: "USD"
            }
        }, options).then(response => {
            console.log(`Data: ${JSON.stringify(response.data, null, 2)}`);
            // Make some UI change to show success 
            const responseData = response.data.data;
            setProcessorToken(responseData.processorToken);

            // Generate a UUID for linking bank account
            const uuid = uuidv4();
            console.log(`UUID for idem key: ${uuid}`);
            setIdempotencyKey(uuid);

            setFormSection(2);
            console.log(`Processor token: ${responseData.processorToken}, UUID: ${uuid}`);
        });
    }

    const [isAccountLinked, setAccountLinked] = useState(false);
    const [accountId, setAccountId] = useState();

    const handleSubmitAddressInfo = (e) => {
        e.preventDefault();

        const nameInput = e.target.elements.name.value;
        const cityInput = e.target.elements.city.value;
        const countryInput = e.target.elements.country.value;
        const line1Input = e.target.elements.line1.value;
        const line2Input = e.target.elements.line2.value;
        const districtInput = e.target.elements.district.value;
        const postalCodeInput = e.target.elements.postalCode.value;
        const emailInput = e.target.elements.email.value;
        const phoneNumberInput = e.target.elements.phoneNumber.value;
        const sessionId = uuidv4();
        const ipAddress = "192.168.0.1";

        if (processorToken === undefined || idempotencyKey === undefined) {
            console.error(`Processor token and idem key must both be set!`);
            setFormSection(1);
            return;
        }

        const data = {
            idempotencyKey,
            plaidProcessorToken: processorToken,
            billingDetails: {
                name: nameInput,
                city: cityInput,
                country: countryInput,
                line1: line1Input,
                line2: line2Input,
                district: districtInput,
                postalCode: postalCodeInput
            },
            metadata: {
                email: emailInput,
                phoneNumber: phoneNumberInput,
                sessionId,
                ipAddress
            }
        }

        axios.post('https://api-sandbox.circle.com/v1/banks/ach', data, options)
            .then(response => {
                console.log(`Data: ${JSON.stringify(response.data, null, 2)}`);

                const accountData = response.data.data;
                setAccountId(accountData.id);
            });
    }

    const REFRESH_INTERVAL = 500; // 500 ms between polls for account status

    // Poll the account endpoint until the status indicates that the account is ready
    // Only when accountId is set and not is account linked 
    useInterval(
        async () => {
            console.log('Checking to see if account is ready');

            axios.get(`https://api-sandbox.circle.com/v1/banks/ach/${accountId}`, options).then(
                pollResponse => {
                    console.log(`Polling account response: ${JSON.stringify(pollResponse.data, null, 2)}`);

                    const status = pollResponse.data.data.status;
                    if (status === "complete") {
                        console.log("Account has successfully been linked!!");
                        setAccountLinked(true);
                        setFormSection(3);
                    } else if (status === "pending") {
                        console.log("Account linking is still pending");
                    } else {
                        console.log("Account linking failed :(");
                    }
                }
            )
        },
        !accountId || isAccountLinked ? null : REFRESH_INTERVAL
    );

    const createCreditCard = () => {};
    
    return (
        <div>
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-around' }}>
                <div id="protocols-column" style={{ border: "1px solid #cccccc", padding: 16, width: 300, margin: "auto", marginTop: 64 }}>
                    {/*
                   * Connect to DeFI protocol and display balance
                   * 
                   * Load the contracts for the protocol (or we just use Zapper API)
                   */}
                    <h2> Idle Protocol </h2>

                    {
                    /* 
                     * We want to two rows of information
                     * 1) deposits
                     *  - symbol 
                     *  - apy 
                     *  - balance
                     *  - balanceUSD
                     * 
                     * 2) claimables
                     *  - symbol
                     *  - balance
                     *  - balanceUSD
                     * 
                     */}
                    <div>
                        <h3> Total Balance [USD] </h3>
                        ${protocolData && protocolData["totalBalance"] && Round(protocolData["totalBalance"]["value"])}
                    </div>
                    <br/>
                    <div>
                        <h3> Deposits </h3>
                        {
                            protocolData && 
                            protocolData["deposit"].map(data => 
                                <div>
                                    Symbol: {data.symbol} <br />
                                    APY: {Round(100 * data.apy)}% <br />
                                    Balance: {Round(data.balance)} <br />
                                    BalanceUSD: ${Round(data.balanceUSD)} <br />
                                </div>
                            )
                        }
                        
                    </div>

                    <br />

                    <div>
                        <h3> Claimables </h3>
                        {
                            protocolData && 
                            protocolData["claimable"].map(data => 
                                <div>
                                    Symbol: {data.symbol} <br />
                                    Balance: {Round(data.balance)} <br />
                                    BalanceUSD: ${Round(data.balanceUSD)} <br />
                                </div>

                            )
                        }
                    </div>

                </div>
                <div id="banks-column" style={{ border: "1px solid #cccccc", padding: 16, width: 300, margin: "auto", marginTop: 64 }}>
                    { formSection < 3 && <div>Connect your bank account [{formSection}/2]</div>}
                    {/*
                    * Connect to bank account
                    */}
                    {formSection === 1 &&
                        <form onSubmit={e => handleSubmitAccountInfo(e)}>
                            <label>ACH Account Number</label>
                            <br />
                            <input name="account" type="text" defaultValue="" required />
                            <br />
                            <label>ACH Account Routing Number</label>
                            <br />
                            <input name="routing" type="text" defaultValue="" required />
                            <br />
                            <label>ACH Account Description</label>
                            <br />
                            <input name="description" type="text" defaultValue="" required />
                            <br />
                            {/* <label>ACH Account Balance</label>
                            <br />
                            <input name="balance" type="text" defaultValue="" required />
                            <br /> */}
                            <Button htmlType="submit">Submit</Button>
                        </form>
                    }
                    {formSection === 2 &&
                        <form onSubmit={e => handleSubmitAddressInfo(e)}>
                            <h2> Billing Information </h2>
                            <label>Name</label>
                            <br />
                            <input name="name" type="text" defaultValue="" required />
                            <br />
                            <label>City</label>
                            <br />
                            <input name="city" type="text" defaultValue="" required />
                            <br />
                            <label>Country</label>
                            <br />
                            <input name="country" type="text" defaultValue="" required />
                            <br />
                            <label>Line1</label>
                            <br />
                            <input name="line1" type="text" defaultValue="" required />
                            <br />
                            <label>Line2</label>
                            <br />
                            <input name="line2" type="text" defaultValue="" />
                            <br />
                            <label>District</label>
                            <br />
                            <input name="district" type="text" defaultValue="" />
                            <br />
                            <label>Postal Code</label>
                            <br />
                            <input name="postalCode" type="text" defaultValue="" />
                            <br />

                            <h2>Other Information</h2>
                            <label>Email</label>
                            <br />
                            <input name="email" type="text" defaultValue="" />
                            <br />
                            <label>Phone Number</label>
                            <br />
                            <input name="phoneNumber" type="text" defaultValue="" />
                            <br />
                            <Button htmlType="submit">Submit</Button>
                        </form>
                    }
                    {formSection === 3 &&
                        <div>
                            <h2> Bank Account Information </h2>
                            {/* Include a spinner and load actual balance */}
                            Balance: ${10000}

                            <Divider />
                            <Button>Add Bank Account</Button>
                        </div>
                    }
                </div>
                <div id="credit-cards-column" style={{ border: "1px solid #cccccc", padding: 16, width: 300, margin: "auto", marginTop: 64 }}>
                    <h2> Credit Card Bills </h2>

                    <div>
                        Balance: $3455 <br/>
                        Due Date: 7/25
                    </div>

                    <Divider />
                    <Button onClick={createCreditCard}>Add Credit Card</Button>
                </div>
                <Xarrow
                    start="protocols-column"
                    end="banks-column"
                />
                <Xarrow
                    start="banks-column"
                    end="credit-cards-column"
                />
            </div>
            
            <div style={{ border: "1px solid #cccccc", padding: 16, width: 600, minHeight: 400, margin: "auto", marginTop: 64 }}>
               <h3> Actions </h3>

                No actions necessary
            </div>
        </div>
    )

}