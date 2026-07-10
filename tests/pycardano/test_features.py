"""Offline feature tests for PyCardano."""
from pycardano import (
    Address,
    Network,
    PaymentSigningKey,
    PaymentVerificationKey,
    TransactionBuilder,
    TransactionInput,
    TransactionOutput,
    UTxO,
    Value,
)


def test_builds_and_balances_transaction(context, keypair):
    """TransactionBuilder selects inputs and estimates a fee offline.

    Covers builds-transactions, coin-selection, and fee-estimation: a successful
    build() with a change address requires the SDK to pick inputs and compute a
    fee that balances the transaction.
    """
    sk, vk, addr = keypair
    utxo = UTxO(
        TransactionInput.from_primitive(["0" * 64, 0]),
        TransactionOutput(addr, Value(10_000_000)),
    )
    builder = TransactionBuilder(context)
    builder.add_input(utxo)
    dest = Address(
        PaymentVerificationKey.from_signing_key(PaymentSigningKey.generate()).hash(),
        network=Network.TESTNET,
    )
    builder.add_output(TransactionOutput(dest, Value(2_000_000)))
    tx = builder.build(change_address=addr)

    assert len(tx.inputs) >= 1
    assert tx.fee > 0
    # Inputs must cover outputs + fee.
    assert sum(o.amount.coin for o in tx.outputs) + tx.fee <= 10_000_000


def test_signs_transaction(keypair):
    """A payment signing key produces a 64-byte Ed25519 signature."""
    sk, _vk, _addr = keypair
    sig = sk.sign(b"transaction body hash placeholder")
    assert isinstance(sig, (bytes, bytearray))
    assert len(sig) == 64


def test_cbor_roundtrip(keypair):
    """A TransactionOutput round-trips losslessly through CBOR."""
    _sk, _vk, addr = keypair
    out = TransactionOutput(addr, Value(5_000_000))
    restored = TransactionOutput.from_cbor(bytes.fromhex(out.to_cbor_hex()))
    assert restored == out
