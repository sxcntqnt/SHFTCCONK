import pino from "pino";
import type { Handle } from "@sveltejs/kit";


const logger = pino({
	level: process.env.LOG_LEVEL ?? "info",

	transport:
		process.env.NODE_ENV !== "production"
			? {
					target: "pino-pretty",
					options: {
						colorize: true,
						translateTime: "SYS:standard",
					},
			  }
			: undefined,
});


export const requestLogger: Handle = async ({ event, resolve }) => {

	const start = performance.now();


	const response = await resolve(event);


	const duration =
		Math.round(performance.now() - start);


	logger.info({
		method: event.request.method,

		path: event.url.pathname,

		status: response.status,

		duration: `${duration}ms`,

		user:
			event.locals.auth?.user?.id ?? null,

		ip:
			event.getClientAddress(),

	});


	return response;
};
