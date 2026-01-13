import { Request, Response } from "express";
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand
} from "@aws-sdk/client-cognito-identity-provider";

const cognito = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
});

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    const command = new InitiateAuthCommand({
      ClientId: process.env.AWS_COGNITO_USER_POOL_CLIENT_ID!,
      AuthFlow: "REFRESH_TOKEN_AUTH",
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
    });

    const response = await cognito.send(command);

    res.json({
      accessToken: response.AuthenticationResult?.AccessToken,
      expiresIn: response.AuthenticationResult?.ExpiresIn,
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const command = new ForgotPasswordCommand({
      ClientId: process.env.AWS_COGNITO_USER_POOL_CLIENT_ID!,
      Username: email,
    });

    await cognito.send(command);

    res.json({ message: "Password reset code sent to email" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, code, newPassword } = req.body;

    const command = new ConfirmForgotPasswordCommand({
      ClientId: process.env.AWS_COGNITO_USER_POOL_CLIENT_ID!,
      Username: email,
      ConfirmationCode: code,
      Password: newPassword,
    });

    await cognito.send(command);

    res.json({ message: "Password reset successful" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
