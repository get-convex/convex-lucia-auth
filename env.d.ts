declare namespace Lucia {
  type Auth = import("./src/index").Auth;
  type DatabaseUserAttributes = import("./src/index").DatabaseUserAttributes;
  type DatabaseSessionAttributes =
    import("./src/index").DatabaseSessionAttributes;
}

declare namespace ConvexLuciaAuth {
  type DataModel = import("./src/index").MinimalDataModel;
}
