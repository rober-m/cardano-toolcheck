// A trivial always-succeeds spending validator. Compiling this proves Aiken can
// lower high-level code to UPLC (feature: compiles-to-uplc) and emit a CIP-57
// plutus.json blueprint (feature: generates-blueprint).
validator always {
  spend(_datum: Option<Data>, _redeemer: Data, _utxo: Data, _tx: Data) {
    True
  }

  else(_) {
    fail
  }
}

// Test blocks exercise Aiken's built-in testing framework
// (feature: property-based-testing / "Built-in Testing Framework").
test arithmetic() {
  1 + 1 == 2
}

test list_ops() {
  [1, 2, 3] == [1, 2, 3]
}
