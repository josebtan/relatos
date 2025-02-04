<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $name = strip_tags(trim($_POST["name"]));
    $email = filter_var(trim($_POST["email"]), FILTER_SANITIZE_EMAIL);
    $subject = strip_tags(trim($_POST["subject"]));
    $message = trim($_POST["message"]);

    if (empty($name) || empty($subject) || empty($message) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo "Error: Todos los campos son obligatorios y el email debe ser válido.";
        exit;
    }

    $to = "josebetan2@gmail.com"; // Cambia esto a tu correo
    $email_subject = "Nuevo mensaje de contacto: $subject";
    $email_body = "Nombre: $name\nCorreo: $email\n\nMensaje:\n$message";
    $headers = "From: $email";

    if (mail($to, $email_subject, $email_body, $headers)) {
        echo "OK";
    } else {
        echo "Error al enviar el mensaje.";
    }
}
?>
