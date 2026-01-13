import { describe, expect, it } from "vitest";
import { buildUploadRequirementPayload, mapUploadUiToRequirements } from "./requirementsMapping";

describe("mapUploadUiToRequirements", () => {
  it("maps allowFileUpload=false to TEXT mode with fileFieldRequired=false", () => {
    expect(
      mapUploadUiToRequirements({
        allowFileUpload: false,
        fileRequired: false,
      })
    ).toEqual({ abstractUploadMode: "TEXT", fileFieldRequired: false });
  });

  it("maps allowFileUpload=false to TEXT mode even if fileRequired is true", () => {
    // fileRequired is ignored when allowFileUpload is false
    expect(
      mapUploadUiToRequirements({
        allowFileUpload: false,
        fileRequired: true,
      })
    ).toEqual({ abstractUploadMode: "TEXT", fileFieldRequired: false });
  });

  it("maps allowFileUpload=true + fileRequired=true to BOTH mode with fileFieldRequired=true", () => {
    expect(
      mapUploadUiToRequirements({
        allowFileUpload: true,
        fileRequired: true,
      })
    ).toEqual({ abstractUploadMode: "BOTH", fileFieldRequired: true });
  });

  it("maps allowFileUpload=true + fileRequired=false to BOTH mode with fileFieldRequired=false", () => {
    expect(
      mapUploadUiToRequirements({
        allowFileUpload: true,
        fileRequired: false,
      })
    ).toEqual({ abstractUploadMode: "BOTH", fileFieldRequired: false });
  });
});

describe("buildUploadRequirementPayload", () => {
  it("returns correct payload for text-only mode", () => {
    expect(
      buildUploadRequirementPayload({
        allowFileUpload: false,
        fileRequired: false,
      })
    ).toEqual({ abstractUploadMode: "TEXT", fileFieldRequired: false });
  });

  it("returns correct payload for optional file upload", () => {
    expect(
      buildUploadRequirementPayload({
        allowFileUpload: true,
        fileRequired: false,
      })
    ).toEqual({ abstractUploadMode: "BOTH", fileFieldRequired: false });
  });

  it("returns correct payload for required file upload", () => {
    expect(
      buildUploadRequirementPayload({
        allowFileUpload: true,
        fileRequired: true,
      })
    ).toEqual({ abstractUploadMode: "BOTH", fileFieldRequired: true });
  });
});
