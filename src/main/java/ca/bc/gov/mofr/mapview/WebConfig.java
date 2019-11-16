package ca.bc.gov.mofr.mapview;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.PropertySource;
import org.springframework.core.env.Environment;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurerAdapter;
import org.springframework.web.servlet.resource.PathResourceResolver;

import com.bedatadriven.jackson.datatype.jts.JtsModule;
import com.fasterxml.jackson.core.JsonParser.Feature;
import com.fasterxml.jackson.databind.ObjectMapper;

@Configuration
@EnableWebMvc
@ComponentScan(basePackages = "ca.bc.gov.mofr.*")
@PropertySource("classpath:application.properties")
public class WebConfig extends WebMvcConfigurerAdapter
{
    private static Log logger = LogFactory.getLog(WebConfig.class);

    @Autowired
    private Environment env;
    
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) 
    {
        // Would be better to set explicit resource paths
        registry.addResourceHandler("/ui/**")
                .addResourceLocations("/static/")
                .setCachePeriod(3600)
                .resourceChain(true)
                .addResolver(new PathResourceResolver());
    }
    
    @Bean
    public ObjectMapper jsonObjectMapper()
    {
        logger.info(" >>> Creating jsonObjectMapper bean");
        
        ObjectMapper mapper = new ObjectMapper();
        mapper.configure(Feature.ALLOW_UNQUOTED_CONTROL_CHARS, true);
        mapper.registerModule(new JtsModule());
        
        logger.info(" <<< Successfully created jsonObjectMapper bean");
        
        return mapper;
    }
    
    @Override
    public void addCorsMappings(CorsRegistry registry)
    {
        registry.addMapping("/**");
    }
}