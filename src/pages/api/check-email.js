import { supabase } from '../../lib/supabase.js'

export async function POST({ request }) {
    try {
        const { email } = await request.json()

        if (!email) {
            return new Response(JSON.stringify({ error: 'Email requis' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // Vérifier si l'email existe déjà
        const { data: existingUser, error: checkError } = await supabase
            .from('auth.users')
            .select('email')
            .eq('email', email)
            .single()

        if (checkError && checkError.code !== 'PGRST116') {
            console.error('Erreur lors de la vérification:', checkError)
            return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        const userExists = !checkError && existingUser

        return new Response(JSON.stringify({
            exists: userExists,
            email: email
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        })

    } catch (error) {
        console.error('Erreur dans check-email:', error)
        return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}

export async function GET() {
    return new Response(JSON.stringify({ message: 'Utilisez POST pour vérifier un email' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
    })
}