declare namespace Lucia {
  type Auth = import("./index").Auth;
  type DatabaseUserAttributes = import("./index").DatabaseUserAttributes;
  type DatabaseSessionAttributes = import("./index").DatabaseSessionAttributes;
}

declare namespace ConvexLuciaAuth {
  type DataModel = MinimalDataModel;
}
