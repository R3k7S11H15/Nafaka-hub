export const a11yProps = {
  web: {
    role: (role) => ({ role }),
    ariaLabel: (label) => ({ 'aria-label': label }),
    tabIndex: (index) => ({ tabIndex: index }),
    ariaLive: (mode = 'polite') => ({ 'aria-live': mode }),
    ariaExpanded: (expanded) => ({ 'aria-expanded': expanded }),
    ariaControls: (id) => ({ 'aria-controls': id }),
    ariaDescribedBy: (id) => ({ 'aria-describedby': id }),
  },
  mobile: {
    accessible: (label) => ({ accessible: true, accessibilityLabel: label }),
    accessibilityHint: (hint) => ({ accessibilityHint: hint }),
    accessibilityRole: (role) => ({ accessibilityRole: role }),
  },
}
