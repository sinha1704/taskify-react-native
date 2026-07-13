import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
};

export type AppStackParamList = {
  Home: undefined;
  TaskDetail: { taskId: string };
  Settings: undefined;
};

export type RootStackParamList = AuthStackParamList & AppStackParamList;

export type AuthNavigationProp = NativeStackNavigationProp<AuthStackParamList>;
export type AppNavigationProp = NativeStackNavigationProp<AppStackParamList>;
export type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;
