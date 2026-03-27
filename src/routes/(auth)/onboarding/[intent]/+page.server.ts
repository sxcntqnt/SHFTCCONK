import { error, redirect } from '@sveltejs/kit';

export const load = async ({ params, locals }) => {
    const intent = params.intent.toLowerCase();
    
    // 1. Validate Intent (Drift Correction: Intent != Actor)
    const VALID_INTENTS = ['passenger', 'crew', 'operator', 'owner'];
    if (!VALID_INTENTS.includes(intent)) {
        throw error(404, "Invalid onboarding path.");
    }

    // 2. Map Intent to Ballerine Workflow
    const workflowId = intent === 'passenger' ? 'kyc_light' : 'kyc_full_ntsa';

    return {
        intent,
        ballerine: {
            workflowId,
            token: await generateBallerineToken(locals.session.user.id)
        }
    };
};

export const actions = {
    submitKyc: async ({ request, locals, params }) => {
        const formData = await request.formData();
        const caseId = formData.get('ballerineCaseId');

        // Update the Profile Layer (Identity Completion)
        // NOT the Actor Layer (per your document)
        await locals.supabase
            .from('profiles')
            .update({ 
                kyc_status: 'pending',
                kyc_intent: params.intent,
                ballerine_case_id: caseId 
            })
            .eq('id', locals.session.user.id);

        redirect(303, '/app/create-profile');
    }
}