"""Shared offline fixtures for the PyCardano feature tests.

A minimal in-memory ChainContext lets TransactionBuilder run entirely offline —
no Blockfrost/Ogmios/Kupo — so coin selection and fee estimation exercise the real
SDK code paths against fixed protocol parameters.
"""
import pytest
from pycardano import (
    Address,
    Network,
    PaymentSigningKey,
    PaymentVerificationKey,
)
from pycardano.backend.base import ChainContext, GenesisParameters, ProtocolParameters


class OfflineContext(ChainContext):
    @property
    def protocol_param(self):
        return ProtocolParameters(
            min_fee_constant=155381,
            min_fee_coefficient=44,
            max_block_size=90112,
            max_tx_size=16384,
            max_block_header_size=1100,
            key_deposit=2000000,
            pool_deposit=500000000,
            pool_influence=0.3,
            monetary_expansion=0.003,
            treasury_expansion=0.2,
            decentralization_param=0,
            extra_entropy="",
            protocol_major_version=8,
            protocol_minor_version=0,
            min_utxo=1000000,
            min_pool_cost=340000000,
            price_mem=0.0577,
            price_step=0.0000721,
            max_tx_ex_mem=14000000,
            max_tx_ex_steps=10000000000,
            max_block_ex_mem=62000000,
            max_block_ex_steps=20000000000,
            max_val_size=5000,
            collateral_percent=150,
            max_collateral_inputs=3,
            coins_per_utxo_byte=4310,
            coins_per_utxo_word=34482,
            cost_models={},
        )

    @property
    def genesis_param(self):
        return GenesisParameters(
            active_slots_coefficient=0.05,
            update_quorum=5,
            max_lovelace_supply=45000000000000000,
            network_magic=1097911063,
            epoch_length=432000,
            system_start=1563999616,
            slots_per_kes_period=129600,
            slot_length=1,
            max_kes_evolutions=62,
            security_param=2160,
        )

    @property
    def network(self):
        return Network.TESTNET

    @property
    def epoch(self):
        return 1

    @property
    def last_block_slot(self):
        return 1

    def utxos(self, address):
        return []


@pytest.fixture
def context():
    return OfflineContext()


@pytest.fixture
def keypair():
    sk = PaymentSigningKey.generate()
    vk = PaymentVerificationKey.from_signing_key(sk)
    addr = Address(vk.hash(), network=Network.TESTNET)
    return sk, vk, addr
