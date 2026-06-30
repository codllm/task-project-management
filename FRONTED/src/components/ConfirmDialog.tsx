import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export type ConfirmDialogAction = {
  text: string;
  onPress?: () => void | Promise<void>;
  style?: "default" | "cancel" | "destructive";
};

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  actions: ConfirmDialogAction[];
  onClose: () => void;
  colors: {
    backdrop?: string;
    surface: string;
    border: string;
    textPrimary: string;
    textSecondary: string;
    muted: string;
    accent: string;
    onAccent: string;
    danger: string;
    dangerBg: string;
    dangerBorder: string;
    input: string;
  };
};

export function ConfirmDialog({
  visible,
  title,
  message,
  actions,
  onClose,
  colors,
}: ConfirmDialogProps) {
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);

  const handleAction = async (action: ConfirmDialogAction, index: number) => {
    if (loadingIndex !== null) return;
    if (action.style === "cancel" || !action.onPress) {
      onClose();
      return;
    }

    setLoadingIndex(index);
    try {
      await action.onPress();
      onClose();
    } finally {
      setLoadingIndex(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 22 }}>
        <Pressable
          onPress={onClose}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: colors.backdrop || "rgba(0,0,0,0.7)",
          }}
        />

        <View
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 18,
            padding: 20,
          }}
        >
          <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: "700", marginBottom: 8 }}>
            {title}
          </Text>
          {message ? (
            <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 20, marginBottom: 18 }}>
              {message}
            </Text>
          ) : null}

          <View style={{ gap: 10 }}>
            {actions.map((action, index) => {
              const isDanger = action.style === "destructive";
              const isCancel = action.style === "cancel";
              const isLoading = loadingIndex === index;
              return (
                <TouchableOpacity
                  key={`${action.text}-${index}`}
                  activeOpacity={0.85}
                  disabled={loadingIndex !== null}
                  onPress={() => handleAction(action, index)}
                  style={{
                    minHeight: 46,
                    borderRadius: 13,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isDanger ? colors.dangerBg : isCancel ? colors.input : colors.accent,
                    borderWidth: isDanger || isCancel ? 1 : 0,
                    borderColor: isDanger ? colors.dangerBorder : colors.border,
                    opacity: loadingIndex !== null && !isLoading ? 0.55 : 1,
                  }}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={isDanger ? colors.danger : colors.onAccent} />
                  ) : (
                    <Text
                      style={{
                        color: isDanger ? colors.danger : isCancel ? colors.textPrimary : colors.onAccent,
                        fontSize: 14,
                        fontWeight: "700",
                      }}
                    >
                      {action.text}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}
