import React from "react";

const WalletsOverview = ({ overview, isLoading }) => {

    const { hbarsInUsd, totalHBars, totalTokens, allTransactions } = overview || {};

    return !isLoading && overview ? (
        <div>
            <h2>Wallets Overview</h2>

            <div className="card mb-3">
                <div className="card-header">
                    <h3>Tokens:</h3>
                </div>
                <div className="card-body">
                    <table className="table table-striped">
                        <tbody>
                            <tr>
                                <td>HBAR:</td>
                                <td>{totalHBars / 100000000} ℏ</td>
                                <td>${hbarsInUsd.toFixed(2)}</td>
                            </tr>
                            {Object.entries(totalTokens).map(([tokenId, token]) => (
                                <tr key={tokenId}>
                                    <td>{token.name}:</td>
                                    <td>{token.balance}</td>
                                    <td>${token.price}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>


            <div>
                <div className="card mb-3">
                    <div className="card-header">
                        <h3>All Transactions:</h3>
                    </div>
                    <div className="card-body">
                        {Object.entries(allTransactions).map(([tokenId, transactions]) => (
                            <div key={tokenId} className="mb-4">
                                <h5>{tokenId}</h5>
                                <table className="table table-striped">
                                    <tbody>
                                        {transactions.map((transaction, index) => (
                                            <tr key={index}>
                                                <td>Amount: {transaction.amount}</td>
                                                <td>{new Date(transaction.consensus_timestamp * 1000).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    ) : (
        <div>Loading...</div>
    );

};

export default WalletsOverview;