module.exports = {
    env: {
        browser: true,
        node: true,
        es2020: true
    },
    extends: ["plugin:prettier/recommended", "eslint:recommended"],
    plugins: ["mocha"],
    rules: {
        "mocha/no-exclusive-tests": "error"
    }
};
