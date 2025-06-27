tailwind.config = {
    theme: {
        extend: {
            colors: {
                primary: '#FF5A5F',
                secondary: '#00A699',
                neutral: {
                    100: '#F7F7F7',
                    200: '#EBEBEB',
                    300: '#DDDDDD',
                    400: '#CCCCCC',
                    500: '#AAAAAA',
                    600: '#767676',
                    700: '#484848',
                    800: '#222222',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            }
        },
    }
}