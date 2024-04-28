import React from 'react';
import { Button, Form, ListGroup } from 'react-bootstrap';

const WalletList = ({ wallets, removeWallet, newWallet, isLoading, handleInputChange, addWallet }) => {
  return (
    <div>
      <h2>Saved Wallets</h2>
      <ListGroup>
        {wallets.map((wallet, index) => (
          <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center">
            {wallet}
            <Button variant="outline-danger" onClick={() => removeWallet(wallet)}>
              Remove
            </Button>
          </ListGroup.Item>
        ))}
        <ListGroup.Item className="d-flex justify-content-between align-items-center">
          <Form.Control type="text" placeholder='Enter Hedera Wallet' value={newWallet} onChange={handleInputChange} className="flex-grow-1" />
          <Button onClick={addWallet} disabled={isLoading} variant="primary">
            {isLoading ? '...' : '+'}
          </Button>
        </ListGroup.Item>
      </ListGroup>
    </div>
  );
};

export default WalletList;
