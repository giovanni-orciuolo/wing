let x = "hi";
if true {
  print("${x}"); // we can access x because it was defined in an outer scope before this statement
  let y = new R(); // we can reference R because it was defined in an outer (regardless of order)
}

// TODO:
// let x = new R(); // forward reference a type in the same scope where it is defined

resource R {
  method2() {
    this.method1(); // we can call method1 because it was defined in an outer (regardless of order)
    print("${this.f}"); // we can access f because it was defined in an outer scope (regardless of order)
    this.method2(); // we can call ourselves because we are defined in an outer scope
  }
  f: str;
  init() {}
  method1() {}
}