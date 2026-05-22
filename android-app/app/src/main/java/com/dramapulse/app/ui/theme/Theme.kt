package com.dramapulse.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val DramaPulseColorScheme = lightColorScheme(
    primary = Accent,
    onPrimary = CardBackground,
    primaryContainer = AccentSoft,
    onPrimaryContainer = Accent,
    secondary = ActiveDot,
    onSecondary = CardBackground,
    secondaryContainer = ChipBackground,
    onSecondaryContainer = TextPrimary,
    tertiary = FeelGoodPrimary,
    onTertiary = CardBackground,
    background = PageBackground,
    onBackground = TextPrimary,
    surface = CardBackground,
    onSurface = TextPrimary,
    surfaceVariant = ChipBackground,
    onSurfaceVariant = TextSecondary,
    outline = Divider,
    outlineVariant = Divider,
    error = ConflictPrimary,
    onError = CardBackground,
)

@Composable
fun DramaPulseTheme(
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = DramaPulseColorScheme,
        typography = DramaPulseTypography,
        content = content
    )
}
