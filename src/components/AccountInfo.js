import React from 'react';

const AccountInfo = ({ accountInfo }) => {
  return (
    <div>
      {Object.keys(accountInfo).map((accountId) => (
        <div key={accountId} className="card mb-3">
          <div className="card-header">
            <h3>Account ID: {accountId}</h3>
          </div>
          <div className="card-body">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>HBARs</td>
                  <td>{accountInfo[accountId].hbars._valueInTinybar / 100000000}</td>
                </tr>
                {accountInfo[accountId].tokens.map((token, i) => (
                  <tr key={i}>
                    <td>{token.details.name}</td>
                    <td>{token.balance / (10 ** token.details.decimals)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AccountInfo;
