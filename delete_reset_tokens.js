const mysql = require("mysql2/promise");
(async () => {
  try {
    const conn = await mysql.createConnection({
      host: "127.0.0.1",
      user: "root",
      password: "",
      database: "taskhive_db",
      port: 3306,
    });
    const [res] = await conn.execute(
      "DELETE prt FROM password_reset_tokens prt JOIN users u ON prt.user_id = u.user_id WHERE u.email = ?",
      ["diegoforrestcruz@gmail.com"]
    );
    console.log("Deleted rows:", res.affectedRows);
    await conn.end();
  } catch (e) {
    console.error("DB error", e.message || e);
    process.exit(1);
  }
})();
